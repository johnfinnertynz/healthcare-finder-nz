import fs from "node:fs";
import path from "node:path";

const [, , csvPath, outputPath = "data/registers/doctors.json", ...flags] = process.argv;
const includeInactive = flags.includes("--include-inactive");

if (!csvPath) {
  console.error("Usage: node tools/import-mcnz-register.mjs <mcnz-register.csv> [output.json] [--include-inactive]");
  console.error("");
  console.error("Imports an approved Medical Council register CSV into a backend-only doctor register.");
  console.error("This does not create first-contact provider records because MCNZ registered addresses are not employment/practice locations.");
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

function compact(values) {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

function fullName(row) {
  return get(row, ["Full name", "Name", "Doctor name"]) || compact([
    get(row, ["First names", "Given names", "First name"]),
    get(row, ["Surname", "Family name", "Last name"])
  ]);
}

function registeredAddress(row) {
  return get(row, ["Registered address", "Address"]) || compact([
    get(row, ["Address line 1", "Address1", "Street address 1"]),
    get(row, ["Address line 2", "Address2", "Street address 2"]),
    get(row, ["Suburb"]),
    get(row, ["City", "Town"]),
    get(row, ["District"]),
    get(row, ["Postcode", "Postal code"])
  ]);
}

function currentPractising(row) {
  const apc = get(row, ["APC status", "Current APC", "APC", "Practising certificate status"]);
  const text = `${apc} ${get(row, ["Status"])}`.toLowerCase();
  if (/\b(y|yes|current|active|valid|true)\b/.test(text)) return true;
  if (/\b(n|no|expired|inactive|suspended|cancelled|cancelled|false)\b/.test(text)) return false;
  return true;
}

function list(value) {
  return String(value || "")
    .split(/[|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const rows = objectRows(parseCsv(fs.readFileSync(csvPath, "utf8")));
const importedAt = new Date().toISOString();
const doctors = rows
  .map((row) => {
    const scopeOfPractice = get(row, ["Scope of practice", "Scope(s) of practice", "Scope"]);
    const vocationalScopes = get(row, ["Vocational scope(s)", "Vocational scopes", "Vocational scope"]);
    const name = fullName(row);
    const current = currentPractising(row);
    const scopeText = `${scopeOfPractice} ${vocationalScopes}`.toLowerCase();

    return {
      name,
      medicalCouncilId: get(row, ["Medical Council identifier", "MCNZ identifier", "MCNZ id", "Medical Council id"]),
      hpiCpn: get(row, ["HPI/CPN", "HPI", "CPN"]),
      scopeOfPractice,
      vocationalScopes: list(vocationalScopes),
      currentPractising: current,
      currentCertificateStart: get(row, ["Current practising certificate start date", "Certificate start date", "APC start"]),
      currentCertificateEnd: get(row, ["Current certificate end date", "Certificate end date", "APC end"]),
      district: get(row, ["District", "Practice district"]),
      registeredAddress: registeredAddress(row),
      qualifications: get(row, ["Qualifications", "Qualification(s)", "Awards"]),
      likelyGp: /general practice|\bgp\b/.test(scopeText),
      likelyPsychiatrist: /psychiatry|psychiatrist/.test(scopeText),
      backendOnly: true,
      source: "https://www.mcnz.org.nz/registration/register-of-doctors/",
      importedAt
    };
  })
  .filter((doctor) => doctor.name && (includeInactive || doctor.currentPractising))
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(doctors, null, 2)}\n`);

const gpCount = doctors.filter((doctor) => doctor.likelyGp).length;
const psychiatristCount = doctors.filter((doctor) => doctor.likelyPsychiatrist).length;
const addressCount = doctors.filter((doctor) => doctor.registeredAddress).length;

console.log(`Imported ${doctors.length} current doctor register records into ${path.resolve(outputPath)}.`);
console.log(`Likely GPs: ${gpCount}. Likely psychiatrists: ${psychiatristCount}. Records with registered address: ${addressCount}.`);
