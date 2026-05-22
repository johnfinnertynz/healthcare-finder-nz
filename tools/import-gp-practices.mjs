import fs from "node:fs";
import path from "node:path";

const [, , csvPath, providersPath = "providers.json"] = process.argv;

if (!csvPath) {
  console.error("Usage: node tools/import-gp-practices.mjs <gp-practices.csv> [providers.json]");
  console.error("");
  console.error("Required CSV columns: name, region, city, website");
  console.error("Optional columns: id, address, phone, email, hours, cost, tags, fit, firstStep, source, verified");
  process.exit(1);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function toObjects(rows) {
  const [header, ...records] = rows;
  const keys = header.map((key) => key.trim());
  return records.map((record) => Object.fromEntries(
    keys.map((key, index) => [key, (record[index] || "").trim()])
  ));
}

const requiredFields = ["name", "region", "city", "website"];
const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const csv = fs.readFileSync(csvPath, "utf8");
const rows = toObjects(parseCsv(csv));
const currentIds = new Set(existing.map((provider) => provider.id));
const imported = [];

for (const row of rows) {
  const missing = requiredFields.filter((field) => !row[field]);
  if (missing.length) {
    console.warn(`Skipping row missing ${missing.join(", ")}: ${row.name || "(unnamed)"}`);
    continue;
  }

  const id = row.id || `${slugify(row.region)}-${slugify(row.name)}`;
  if (currentIds.has(id)) continue;
  currentIds.add(id);

  imported.push({
    id,
    name: row.name,
    type: "gp",
    region: row.region,
    city: row.city,
    address: row.address || "",
    phone: row.phone || "",
    text: "",
    email: row.email || "",
    website: row.website,
    hours: row.hours || "Ask the practice about appointment and enrolment hours",
    cost: row.cost || "Varies by practice; enrolled patients usually pay less. Ask about Community Services Card and Very Low Cost Access fees.",
    tags: [
      "gp",
      "primary-care",
      "depression",
      "anxiety",
      "work",
      "cost",
      ...String(row.tags || "").split(/[|;]/).map((tag) => tag.trim()).filter(Boolean)
    ],
    fit: row.fit || "General practice team that can help with mental health first steps, medication discussion, referrals, and access to funded primary mental health support where available.",
    firstStep: row.firstStep || "Contact the practice and ask whether they are enrolling new patients, what the first appointment costs, and whether they have a health improvement practitioner, health coach, counsellor, or social worker.",
    source: row.source || row.website,
    verified: row.verified || new Date().toISOString().slice(0, 7)
  });
}

const output = [...imported, ...existing].sort((a, b) =>
  a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
);

fs.writeFileSync(providersPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${imported.length} GP practice records into ${path.resolve(providersPath)}.`);
