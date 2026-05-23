import fs from "node:fs";
import path from "node:path";

const [, , csvPath, outputPath = "data/registers/psychologists.json", ...flags] = process.argv;
const includeInactive = flags.includes("--include-inactive");

if (!csvPath) {
  console.error("Usage: node tools/import-psychologists-board-register.mjs <psychologists-board-register.csv> [output.json] [--include-inactive]");
  console.error("");
  console.error("Imports a New Zealand Psychologists Board register export into a backend-only verification register.");
  console.error("This does not create first-contact provider records because the register is not a practice contact directory.");
  process.exit(1);
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

function objectRows(rows) {
  const [header, ...records] = rows;
  const keys = header.map((key) => key.trim());
  return records.map((record) => Object.fromEntries(
    keys.map((key, index) => [key, (record[index] || "").trim()])
  ));
}

function normaliseKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function get(row, wanted) {
  const wantedKeys = wanted.map(normaliseKey);
  const key = Object.keys(row).find((candidate) => wantedKeys.includes(normaliseKey(candidate)));
  return key ? row[key] : "";
}

function fullName(row) {
  const firstNames = get(row, ["First Names", "First Name", "Given Names"]);
  const surname = get(row, ["Surname", "Family Name", "Last Name"]);
  return [firstNames, surname].filter(Boolean).join(" ").trim() || get(row, ["Name"]);
}

function currentPractising(row) {
  const text = `${get(row, ["Status"])} ${get(row, ["APC Valid", "APC"])}`.toLowerCase();
  if (/\b(expired|inactive|suspended|cancelled|no|false|blocked)\b/.test(text)) return false;
  return true;
}

function searchQueries(name, scopes) {
  const quoted = `"${name}"`;
  return [
    `${quoted} psychologist New Zealand`,
    `${quoted} clinical psychologist New Zealand`,
    `${quoted} psychology practice contact`,
    `${quoted} ${scopes || "psychologist"} private practice`
  ];
}

const rows = objectRows(parseCsv(fs.readFileSync(csvPath, "utf8")));
const importedAt = new Date().toISOString();
const psychologists = rows
  .map((row) => {
    const scopes = get(row, ["Scope(s) of Practice", "Scopes of Practice", "Scope"]);
    const name = fullName(row);
    const current = currentPractising(row);

    return {
      name,
      registrationNo: get(row, ["Registration No", "Registration Number"]),
      status: get(row, ["Status"]),
      apcValid: get(row, ["APC Valid", "APC"]),
      qualifications: get(row, ["Qualification(s)", "Qualifications"]),
      dateOfRegistration: get(row, ["Date of Registration", "Registration Date"]),
      scopes,
      conditionsOnScopes: get(row, ["Conditions on Scope(s) of Practice", "Conditions"]),
      otherInformation: get(row, ["Other Information"]),
      currentPractising: current,
      likelyClinicalPsychologist: /clinical/i.test(scopes),
      publicResearchQueries: name ? searchQueries(name, scopes) : [],
      backendOnly: true,
      source: "https://psychologistsboard.org.nz/search-register/",
      importedAt
    };
  })
  .filter((psychologist) => psychologist.name && (includeInactive || psychologist.currentPractising))
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(psychologists, null, 2)}\n`);

const clinicalCount = psychologists.filter((psychologist) => psychologist.likelyClinicalPsychologist).length;
console.log(`Imported ${psychologists.length} current psychologist register records into ${path.resolve(outputPath)}.`);
console.log(`Likely clinical psychologists: ${clinicalCount}.`);
