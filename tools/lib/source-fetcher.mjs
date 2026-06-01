import crypto from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { sourceDomain } from "./provider-evidence-scorer.mjs";

const defaultUserAgent = "CareFinderAotearoa/1.0 provider discovery (https://github.com/johnfinnertynz/healthcare-finder-nz)";
const blockedStatusCodes = new Set([401, 403, 407, 429]);
const maxBytesDefault = 750_000;

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

export function shouldNotFetch(url = "") {
  if (!isHttpUrl(url)) return "not-http";
  const host = sourceDomain(url);
  if (!host) return "invalid-url";
  if (/google\.com$|bing\.com$|duckduckgo\.com$/i.test(host) && /\/search/i.test(new URL(url).pathname)) return "search-result-page";
  if (/facebook\.com$|instagram\.com$|x\.com$|twitter\.com$/i.test(host)) return "social-network";
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)(?:$|\?)/i.test(url)) return "large-or-binary-file";
  return "";
}

export function isLikelyLoginPage(text = "", finalUrl = "") {
  const source = String(text || "");
  const url = String(finalUrl || "");
  if (/\b(captcha|recaptcha|verify you are human|access denied|checking your browser|enable javascript and cookies)\b/i.test(source)) return true;
  if (/\b(login|signin|sign-in|logon|auth|account)\b/i.test(url)) return true;
  if (/<input[^>]+type=["']?password["']?/i.test(source)) return true;
  if (/<form[^>]+(?:login|signin|sign-in|logon|auth)/i.test(source)) return true;
  if (/<title[^>]*>\s*(?:log in|login|sign in|create account)\b/i.test(source)) return true;
  if (/<h1[^>]*>\s*(?:log in|login|sign in|create account)\b/i.test(source)) return true;
  return false;
}

async function readLimitedText(response, maxBytes) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength && contentLength > maxBytes) {
    return { tooLarge: true, text: "" };
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { tooLarge: true, text: text.slice(0, maxBytes) };
  }
  return { tooLarge: false, text };
}

export async function fetchPublicSource(url, options = {}) {
  const capturedAt = new Date().toISOString();
  const skipReason = shouldNotFetch(url);
  if (skipReason) {
    return {
      url,
      finalUrl: url,
      capturedAt,
      ok: false,
      blocked: skipReason === "search-result-page" || skipReason === "social-network",
      skipped: true,
      status: 0,
      contentType: "",
      error: skipReason,
      text: "",
      sourceHash: ""
    };
  }

  const timeoutMs = options.timeoutMs || 12_000;
  const maxBytes = options.maxBytes || maxBytesDefault;

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "text/html, text/plain, application/xhtml+xml",
        "user-agent": options.userAgent || defaultUserAgent
      }
    });
    const finalUrl = response.url || url;
    const contentType = response.headers.get("content-type") || "";
    const blocked = blockedStatusCodes.has(response.status);
    if (!response.ok || blocked) {
      return {
        url,
        finalUrl,
        capturedAt,
        ok: false,
        blocked,
        skipped: false,
        status: response.status,
        contentType,
        error: blocked ? "blocked-by-site" : response.statusText,
        text: "",
        sourceHash: ""
      };
    }

    if (!/text\/html|text\/plain|application\/xhtml|application\/json/i.test(contentType)) {
      return {
        url,
        finalUrl,
        capturedAt,
        ok: false,
        blocked: false,
        skipped: true,
        status: response.status,
        contentType,
        error: "unsupported-content-type",
        text: "",
        sourceHash: ""
      };
    }

    const limited = await readLimitedText(response, maxBytes);
    if (limited.tooLarge) {
      return {
        url,
        finalUrl,
        capturedAt,
        ok: false,
        blocked: false,
        skipped: true,
        status: response.status,
        contentType,
        error: "too-large",
        text: "",
        sourceHash: crypto.createHash("sha256").update(limited.text || "").digest("hex")
      };
    }

    const loginRequired = isLikelyLoginPage(limited.text, finalUrl);
    return {
      url,
      finalUrl,
      capturedAt,
      ok: !loginRequired,
      blocked: loginRequired,
      skipped: false,
      status: response.status,
      contentType,
      error: loginRequired ? "login-or-captcha-required" : "",
      text: loginRequired ? "" : limited.text,
      sourceHash: crypto.createHash("sha256").update(limited.text || "").digest("hex")
    };
  } catch (error) {
    return {
      url,
      finalUrl: url,
      capturedAt,
      ok: false,
      blocked: false,
      skipped: false,
      status: 0,
      contentType: "",
      error: error.name === "TimeoutError" ? "timeout" : error.message,
      text: "",
      sourceHash: ""
    };
  }
}

export async function fetchSources(urls, options = {}) {
  const results = [];
  const rateLimitMs = options.rateLimitMs ?? 1500;
  for (const url of urls) {
    results.push(await fetchPublicSource(url, options));
    if (rateLimitMs > 0) await delay(rateLimitMs);
  }
  return results;
}
