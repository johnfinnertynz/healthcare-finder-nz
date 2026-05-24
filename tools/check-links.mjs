import fs from "node:fs";

const files = ["index.html", "README.md", "PROVIDER_DATABASE.md"];
const urls = new Set();
const providerLinkMode = process.env.CHECK_PROVIDER_LINKS || "sample";
const providerLinkLimit = Number(process.env.PROVIDER_LINK_LIMIT || 150);
const checkProviderSources = process.env.CHECK_PROVIDER_SOURCES === "true";

function collectFromText(text) {
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>),]+/g)) {
    const url = match[0].replace(/[.;]+$/, "");
    if (!isLocalDevUrl(url)) urls.add(url);
  }
}

function isLocalDevUrl(value) {
  try {
    const url = new URL(value);
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  collectFromText(fs.readFileSync(file, "utf8"));
}

if (fs.existsSync("providers.json") && providerLinkMode !== "off") {
  const providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
  const providerUrls = providers
    .flatMap((provider) => [
      provider.website ? { url: provider.website, generatedGp: provider.importSource === "doctorpricer" } : null,
      checkProviderSources && provider.source ? { url: provider.source, generatedGp: false } : null
    ].filter(Boolean))
    .filter((item) => /^https?:\/\//i.test(item.url));

  const mustCheck = providerUrls.filter((item) => !item.generatedGp).map((item) => item.url);
  const generated = providerUrls.filter((item) => item.generatedGp).map((item) => item.url).sort();
  const generatedLimit = providerLinkMode === "full" ? generated.length : Math.max(0, providerLinkLimit);

  for (const url of mustCheck) urls.add(url);
  for (const url of generated.slice(0, generatedLimit)) urls.add(url);
}

async function request(url, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 Care Finder link checker" }
    });
    clearTimeout(timer);
    return { response };
  } catch (error) {
    clearTimeout(timer);
    return { error };
  }
}

async function check(url) {
  let { response, error } = await request(url, "HEAD", 15000);

  if (error || [400, 403, 405].includes(response.status)) {
    ({ response, error } = await request(url, "GET", 30000));
  }

  if (error) {
    return {
      url,
      status: "ERR",
      error: error.name,
      ok: false,
      blocked: false
    };
  }

  return {
    url,
    status: response.status,
    final: response.url,
    ok: response.status >= 200 && response.status < 400,
    blocked: response.status === 401 || response.status === 403
  };
}

const results = [];
for (const url of [...urls].sort()) {
  results.push(await check(url));
}

const broken = results.filter((result) => !result.ok && !result.blocked);
const blocked = results.filter((result) => result.blocked);
const redirected = results.filter((result) => result.ok && result.final && result.final !== result.url);

for (const result of broken) {
  console.log(`BROKEN ${result.status} ${result.url}${result.error ? ` (${result.error})` : ""}`);
}

for (const result of blocked) {
  console.log(`BLOCKED ${result.status} ${result.url}`);
}

for (const result of redirected) {
  console.log(`REDIRECT ${result.status} ${result.url} -> ${result.final}`);
}

console.log(`Checked ${results.length} links. Broken: ${broken.length}. Blocked by site: ${blocked.length}. Redirects: ${redirected.length}.`);
process.exitCode = broken.length ? 1 : 0;
