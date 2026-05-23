import fs from "node:fs";
import path from "node:path";

const [, , csvPath, outputPath = "psychologists-board-research.json"] = process.argv;

if (!csvPath) {
  console.error("Usage: node tools/prepare-psychologists-board-research.mjs <psychologists-board-register.csv> [output.json]");
  console.error("");
  console.error("Builds a verification/research queue from an exported New Zealand Psychologists Board register search.");
  console.error("This does not create provider records; contact details must come from public practice pages or approved directories.");
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

function normaliseKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function objectRows(rows) {
  const [header, ...records] = rows;
  const keys = header.map((key) => key.trim());
  return records.map((record) => Object.fromEntries(
    keys.map((key, index) => [key, (record[index] || "").trim()])
  ));
}

function get(row, wanted) {
  const wantedKeys = wanted.map(normaliseKey);
  const key = Object.keys(row).find((candidate) => wantedKeys.includes(normaliseKey(candidate)));
  return key ? row[key] : "";
}

function isCurrent(row) {
  const status = get(row, ["Status"]);
  const apc = get(row, ["APC Valid", "APC"]);
  const text = `${status} ${apc}`.toLowerCase();
  return !/(cancelled|suspended|expired|inactive|no|false)/.test(text);
}

function fullName(row) {
  const firstNames = get(row, ["First Names", "First Name", "Given Names"]);
  const surname = get(row, ["Surname", "Family Name", "Last Name"]);
  const name = get(row, ["Name"]);
  return [firstNames, surname].filter(Boolean).join(" ").trim() || name;
}

function searchQueries(name, scopes) {
  const quoted = `"${name}"`;
  const scopeText = scopes ? ` "${scopes}"` : "";
  return [
    `${quoted} psychologist New Zealand`,
    `${quoted} clinical psychologist New Zealand`,
    `${quoted}${scopeText} private practice`,
    `${quoted} psychology contact email phone`
  ];
}

const rows = objectRows(parseCsv(fs.readFileSync(csvPath, "utf8")));
const queue = rows
  .map((row) => {
    const name = fullName(row);
    const scopes = get(row, ["Scope(s) of Practice", "Scopes of Practice", "Scope"]);
    return {
      name,
      registrationNo: get(row, ["Registration No", "Registration Number"]),
      status: get(row, ["Status"]),
      apcValid: get(row, ["APC Valid", "APC"]),
      qualifications: get(row, ["Qualification(s)", "Qualifications"]),
      scopes,
      current: isCurrent(row),
      boardRegisterSource: "https://psychologistsboard.org.nz/search-register/",
      publicResearchQueries: name ? searchQueries(name, scopes) : []
    };
  })
  .filter((item) => item.name && item.current)
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Prepared ${queue.length} current psychologist research records at ${path.resolve(outputPath)}.`);
