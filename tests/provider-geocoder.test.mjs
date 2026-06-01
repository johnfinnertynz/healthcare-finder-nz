import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  coordinateMetadataFromSource,
  geocodeProviderRecords,
  isNewZealandCoordinate
} from "../tools/lib/provider-geocoder.mjs";

function tempConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-geocoder-"));
  const configPath = path.join(dir, "provider-sources.json");
  fs.writeFileSync(configPath, JSON.stringify({
    geocoding: {
      cachePath: path.join(dir, "geocode-cache.json"),
      rateLimitMs: 0,
      userAgent: "CareFinderTest/1.0"
    }
  }, null, 2));
  return configPath;
}

test("geocoder stores coordinate confidence metadata for accepted NZ results", async () => {
  const providers = [{
    id: "test-clinic",
    name: "Test Clinic",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    address: "1 Queen Street"
  }];

  const summary = await geocodeProviderRecords(providers, {
    configPath: tempConfig(),
    today: "2026-06-01",
    fetchGeocode: async () => ({
      lat: -36.8485,
      lon: 174.7633,
      displayName: "1 Queen Street, Auckland, New Zealand",
      addresstype: "clinic",
      place_rank: 30
    })
  });

  assert.equal(summary.updated, 1);
  assert.equal(summary.outsideNz, 0);
  assert.equal(providers[0].lat, -36.8485);
  assert.equal(providers[0].lon, 174.7633);
  assert.equal(providers[0].coordinateSource, "OpenStreetMap Nominatim 2026-06-01");
  assert.equal(providers[0].coordinatePrecision, "address geocode");
  assert.equal(providers[0].coordinateConfidence, "medium");
  assert.equal(providers[0].geocodeNeedsManualReview, true);
});

test("geocoder rejects fetched coordinates outside New Zealand", async () => {
  const providers = [{
    id: "wrong-country",
    name: "Wrong Country Clinic",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    address: "1 Queen Street"
  }];

  const summary = await geocodeProviderRecords(providers, {
    configPath: tempConfig(),
    today: "2026-06-01",
    fetchGeocode: async () => ({
      lat: 40.7128,
      lon: -74.006,
      displayName: "New York, United States",
      addresstype: "city"
    })
  });

  assert.equal(summary.updated, 0);
  assert.equal(summary.outsideNz, 1);
  assert.equal(providers[0].lat, undefined);
  assert.equal(providers[0].coordinateSource, undefined);
});

test("coordinate metadata helper keeps third-party geocodes review-gated", () => {
  assert.deepEqual(coordinateMetadataFromSource("DoctorPricer public API 2026-05"), {
    coordinatePrecision: "business listing",
    coordinateConfidence: "medium",
    geocodeNeedsManualReview: true
  });
  assert.deepEqual(coordinateMetadataFromSource("not recorded - needs manual review"), {
    coordinatePrecision: "coordinate source unspecified",
    coordinateConfidence: "low",
    geocodeNeedsManualReview: true
  });
  assert.deepEqual(coordinateMetadataFromSource("RANZCP Your Health in Mind profile 2026-05"), {
    coordinatePrecision: "professional directory listing",
    coordinateConfidence: "medium",
    geocodeNeedsManualReview: true
  });
});

test("NZ coordinate guard accepts main NZ and Chatham Islands ranges only", () => {
  assert.equal(isNewZealandCoordinate(-36.8485, 174.7633), true);
  assert.equal(isNewZealandCoordinate(-43.95, -176.56), true);
  assert.equal(isNewZealandCoordinate(40.7128, -74.006), false);
});
