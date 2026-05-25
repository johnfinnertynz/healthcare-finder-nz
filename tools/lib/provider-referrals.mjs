export const referralTypes = new Set(["gp", "self", "specialist", "unknown"]);
export const referralConfidences = new Set(["high", "medium", "low"]);

export function isPsychiatryRecord(provider) {
  return provider?.type === "psychiatrist" || provider?.tags?.includes("psychiatry-service");
}

export function normaliseReferralType(value) {
  return referralTypes.has(value) ? value : "";
}

export function normaliseReferralConfidence(value) {
  return referralConfidences.has(value) ? value : "";
}

export function referralEvidenceText(provider) {
  return [
    provider?.name,
    provider?.fit,
    provider?.firstStep,
    provider?.cost,
    provider?.hours,
    provider?.website,
    provider?.bookingUrl,
    provider?.source,
    provider?.referralSourceExcerpt,
    ...(provider?.tags || [])
  ].filter(Boolean).join(" ");
}

export function inferReferralMetadata(provider, { checkedAt = new Date().toISOString().slice(0, 7) } = {}) {
  const text = referralEvidenceText(provider);
  const sourceUrl = provider.referralSourceUrl || provider.source || provider.website || "";

  if (!isPsychiatryRecord(provider)) return {};

  if (/yourhealthinmind\.org\/find-a-psychiatrist\/profile\//i.test(sourceUrl)) {
    return {
      requiresReferral: true,
      referralType: "gp",
      referralSourceUrl: sourceUrl,
      referralSourceExcerpt: "Your Health in Mind profile says people must first see their GP for a referral.",
      referralConfidence: "high",
      referralLastChecked: checkedAt,
      referralNeedsManualReview: false
    };
  }

  if (/christchurchpsychmed\.co\.nz/i.test(sourceUrl)) {
    return {
      requiresReferral: true,
      referralType: "gp",
      referralSourceUrl: "https://www.christchurchpsychmed.co.nz/helpful-info",
      referralSourceExcerpt: "Christchurch PsychMed says a GP referral is required to see a psychiatrist; clinical psychologist referrals are helpful but not essential.",
      referralConfidence: "high",
      referralLastChecked: checkedAt,
      referralNeedsManualReview: false
    };
  }

  const clearGpReferral = /\bmust\s+first\s+see\s+(?:your\s+)?(?:gp|doctor|general practitioner)\b|\b(?:please\s+)?contact\s+(?:your\s+)?(?:gp|doctor|general practitioner)\s+to\s+make\s+a\s+referral\b|\bask\s+(?:your\s+)?(?:gp|doctor|general practitioner)\s+for\s+(?:a\s+)?referral\b|\b(?:gp|doctor|general practitioner)\s+referral\s+(?:is\s+)?(?:required|needed)\b/i;
  const asksWhetherGpReferral = /\b(?:whether|if)\b.{0,80}\b(?:gp|doctor|general practitioner)\b.{0,80}\breferr|\b(?:whether|if)\b.{0,80}\breferr.{0,80}\b(?:gp|doctor|general practitioner)\b/i;
  const selfReferral = /\b(self[-\s]?referr(?:al|ed|ing)?|self[-\s]?refer|patients?\s+can\s+(?:make\s+)?a\s+referral|book\s+online|book\s+now|patient\s+portal)\b/i;

  if (selfReferral.test(text) && !clearGpReferral.test(text)) {
    return {
      requiresReferral: false,
      referralType: "self",
      referralSourceUrl: sourceUrl,
      referralSourceExcerpt: "Public information suggests self-referral, online booking, or direct patient enquiry is available.",
      referralConfidence: "medium",
      referralLastChecked: checkedAt,
      referralNeedsManualReview: true
    };
  }

  if (clearGpReferral.test(text) && !asksWhetherGpReferral.test(text)) {
    return {
      requiresReferral: true,
      referralType: "gp",
      referralSourceUrl: sourceUrl,
      referralSourceExcerpt: "Public information points people to a GP or doctor referral pathway.",
      referralConfidence: "medium",
      referralLastChecked: checkedAt,
      referralNeedsManualReview: true
    };
  }

  return {
    requiresReferral: false,
    referralType: "unknown",
    referralSourceUrl: sourceUrl,
    referralSourceExcerpt: "Referral requirements are not clearly published in the stored source fields.",
    referralConfidence: "low",
    referralLastChecked: checkedAt,
    referralNeedsManualReview: true
  };
}
