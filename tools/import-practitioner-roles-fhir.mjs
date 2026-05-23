import fs from "node:fs";
import path from "node:path";

const [, , bundlePath, outputPath = "data/registers/practitioner-roles.json", ...flags] = process.argv;
const includeAll = flags.includes("--all-practitioners");

if (!bundlePath) {
  console.error("Usage: node tools/import-practitioner-roles-fhir.mjs <fhir-bundle.json> [output.json] [--all-practitioners]");
  console.error("");
  console.error("Imports PractitionerRole links from an approved FHIR Bundle into a backend-only doctor/practitioner location register.");
  process.exit(1);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textFromCodeableConcepts(values) {
  return asArray(values)
    .flatMap((value) => [
      value.text,
      ...asArray(value.coding).flatMap((coding) => [coding.display, coding.code])
    ])
    .filter(Boolean);
}

function telecom(resource, system) {
  return asArray(resource?.telecom)
    .find((item) => item.system === system && item.value)?.value || "";
}

function addressText(resource) {
  const address = asArray(resource?.address)[0];
  if (!address) return "";
  return [
    ...(address.line || []),
    address.suburb,
    address.city,
    address.district,
    address.postalCode
  ].filter(Boolean).join(", ");
}

function humanName(practitioner) {
  const name = asArray(practitioner?.name)[0];
  if (!name) return "";
  return name.text || [
    ...(name.prefix || []),
    ...(name.given || []),
    name.family
  ].filter(Boolean).join(" ");
}

function position(resource) {
  const latitude = Number(resource?.position?.latitude);
  const longitude = Number(resource?.position?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { lat: latitude, lon: longitude }
    : { lat: "", lon: "" };
}

function keyFor(resource) {
  return `${resource.resourceType}/${resource.id}`;
}

function resolveReference(reference, resources) {
  if (!reference) return null;
  if (resources.has(reference)) return resources.get(reference);
  const withoutBase = reference.replace(/^https?:\/\/[^/]+\/(?:fhir\/)?/i, "");
  return resources.get(withoutBase) || null;
}

function identifier(resource, pattern) {
  return asArray(resource?.identifier)
    .find((item) => pattern.test(`${item.system || ""} ${item.type?.text || ""}`))?.value || "";
}

function likelyDoctor(role, practitioner) {
  const text = [
    role.practitioner?.display,
    role.organization?.display,
    ...textFromCodeableConcepts(role.code),
    ...textFromCodeableConcepts(role.specialty),
    ...asArray(practitioner?.qualification).flatMap((qualification) => [
      qualification.code?.text,
      ...textFromCodeableConcepts(qualification.code)
    ])
  ].join(" ").toLowerCase();

  return /doctor|medical practitioner|general practitioner|general practice|\bgp\b|physician|psychiatrist|psychiatry/.test(text);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const resources = new Map();

for (const entry of asArray(bundle.entry)) {
  if (!entry.resource?.resourceType || !entry.resource?.id) continue;
  resources.set(keyFor(entry.resource), entry.resource);
  if (entry.fullUrl) resources.set(entry.fullUrl, entry.resource);
}

const importedAt = new Date().toISOString();
const roles = asArray(bundle.entry)
  .map((entry) => entry.resource)
  .filter((resource) => resource?.resourceType === "PractitionerRole")
  .map((role) => {
    const practitioner = resolveReference(role.practitioner?.reference, resources);
    const organization = resolveReference(role.organization?.reference, resources);
    const locations = asArray(role.location)
      .map((reference) => resolveReference(reference.reference, resources))
      .filter(Boolean);
    const locationRecords = locations.map((location) => {
      const coords = position(location);
      return {
        name: location.name || "",
        address: addressText(location),
        phone: telecom(location, "phone"),
        email: telecom(location, "email"),
        website: telecom(location, "url"),
        lat: coords.lat,
        lon: coords.lon
      };
    });

    const roleText = [
      ...textFromCodeableConcepts(role.code),
      ...textFromCodeableConcepts(role.specialty)
    ].join("; ");

    const contactPhone = telecom(role, "phone") || telecom(organization, "phone") || locationRecords.find((location) => location.phone)?.phone || "";
    const contactEmail = telecom(role, "email") || telecom(organization, "email") || locationRecords.find((location) => location.email)?.email || "";
    const contactWebsite = telecom(role, "url") || telecom(organization, "url") || locationRecords.find((location) => location.website)?.website || "";
    const text = `${roleText} ${role.practitioner?.display || ""}`.toLowerCase();

    return {
      name: humanName(practitioner) || role.practitioner?.display || "",
      hpiPersonId: identifier(practitioner, /hpi-person|hpi/i),
      registrationNo: identifier(practitioner, /medical|mcnz|council|registration/i),
      role: roleText,
      active: role.active !== false,
      organization: organization?.name || role.organization?.display || "",
      locations: locationRecords,
      phone: contactPhone,
      email: contactEmail,
      website: contactWebsite,
      likelyGp: /general practice|general practitioner|\bgp\b/.test(text),
      likelyPsychiatrist: /psychiatry|psychiatrist/.test(text),
      backendOnly: true,
      source: `FHIR PractitionerRole/${role.id || ""}`.trim(),
      importedAt
    };
  })
  .filter((role) => role.name && role.active && (includeAll || role.likelyGp || role.likelyPsychiatrist || likelyDoctor({ code: [{ text: role.role }], specialty: [] }, null)))
  .sort((a, b) => a.name.localeCompare(b.name) || a.organization.localeCompare(b.organization));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(roles, null, 2)}\n`);

console.log(`Imported ${roles.length} backend-only practitioner role records into ${path.resolve(outputPath)}.`);
console.log(`Likely GPs: ${roles.filter((role) => role.likelyGp).length}. Likely psychiatrists: ${roles.filter((role) => role.likelyPsychiatrist).length}.`);
