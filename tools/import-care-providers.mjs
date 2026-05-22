import fs from "node:fs";
import path from "node:path";

const [, , csvPath, providersPath = "providers.json"] = process.argv;

if (!csvPath) {
  console.error("Usage: node tools/import-care-providers.mjs <care-providers.csv> [providers.json]");
  console.error("");
  console.error("Required columns: name, type, region, city, source");
  console.error("Required contact: at least one of phone, text, email, website");
  console.error("Allowed type: counsellor, psychologist, psychiatrist");
  console.error("Optional columns: id, address, cost, hours, tags, fit, firstStep, verified");
  process.exit(1);
}

const allowedTypes = new Set(["counsellor", "psychologist", "psychiatrist"]);

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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tagList(row) {
  const defaults = [row.type, "fit"];
  if (row.type === "psychiatrist") defaults.push("medical-specialist");
  if (row.type === "psychologist") defaults.push("clinical-assessment");

  return [...new Set([
    ...defaults,
    ...String(row.tags || "").split(/[|;]/).map((tag) => tag.trim()).filter(Boolean)
  ])];
}

const requiredFields = ["name", "type", "region", "city", "source"];
const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const existingIds = new Set(existing.map((provider) => provider.id));
const rows = toObjects(parseCsv(fs.readFileSync(csvPath, "utf8")));
const imported = [];

for (const row of rows) {
  const missing = requiredFields.filter((field) => !row[field]);
  const hasContact = Boolean(row.phone || row.text || row.email || row.website);

  if (missing.length || !hasContact || !allowedTypes.has(row.type)) {
    console.warn(`Skipping ${row.name || "(unnamed)"}: missing=${missing.join("|") || "none"} contact=${hasContact} type=${row.type || "none"}`);
    continue;
  }

  const id = row.id || `${slugify(row.region)}-${slugify(row.type)}-${slugify(row.name)}`;
  if (existingIds.has(id)) continue;
  existingIds.add(id);

  imported.push({
    id,
    name: row.name,
    type: row.type,
    region: row.region,
    city: row.city,
    address: row.address || "",
    phone: row.phone || "",
    text: row.text || "",
    email: row.email || "",
    website: row.website || row.source,
    hours: row.hours || "Ask provider about current availability",
    cost: row.cost || "Ask provider about fees, WINZ, ACC, EAP, insurance, or funded options",
    tags: tagList(row),
    fit: row.fit || `${row.name} is a ${row.type} contact with public contact details verified from the listed source.`,
    firstStep: row.firstStep || "Send a short enquiry asking about availability, fees, funding options, and whether they are a good fit for what is happening.",
    source: row.source,
    verified: row.verified || new Date().toISOString().slice(0, 7)
  });
}

const output = [...imported, ...existing].sort((a, b) =>
  a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
);

fs.writeFileSync(providersPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${imported.length} direct care provider records into ${path.resolve(providersPath)}.`);
