import { Claim } from "@/types/claim";
import {
  CoverageEligibilityRequest,
  CoverageEligibilityRequestPurposeChoice,
} from "@/types/coverage_eligibility";

/** Hard-stop reason returned by deriveValidationOutcome. */
export type ValidationOutcome =
  | { kind: "pending" }
  | { kind: "error" }
  | { kind: "ok" }
  | { kind: "policy-inactive"; message: string }
  | { kind: "no-balance"; message: string };

/**
 * Inspect a Coverage Eligibility (validation) request and decide whether
 * the patient can move forward in the flow.
 */
export function deriveValidationOutcome(
  request: CoverageEligibilityRequest
): ValidationOutcome {
  const response = request.latest_response;
  if (!response) return { kind: "pending" };
  if (response.outcome === "error") return { kind: "error" };
  if (response.outcome === "queued" || response.outcome === "partial")
    return { kind: "pending" };

  const insurances = response.insurances ?? [];
  if (insurances.length === 0) return { kind: "pending" };

  const primary = insurances.find((e) => e.is_primary) ?? insurances[0];

  if (primary.inforce === false) {
    return {
      kind: "policy-inactive",
      message:
        "Policy is not active for this patient. No further actions can be performed.",
    };
  }

  if (primary.balance) {
    const remaining = primary.balance.allowed.value - primary.balance.used.value;
    if (remaining <= 0) {
      return {
        kind: "no-balance",
        message:
          "Wallet balance is exhausted for this patient. No further actions can be performed.",
      };
    }
  }

  return { kind: "ok" };
}

export function hasValidationPurpose(
  request: CoverageEligibilityRequest
): boolean {
  return request.purpose.includes("validation");
}

export function hasAuthRequirementsPurpose(
  request: CoverageEligibilityRequest
): boolean {
  return request.purpose.includes("auth-requirements");
}

export function isPrimaryPurpose(
  request: CoverageEligibilityRequest,
  purpose: CoverageEligibilityRequestPurposeChoice
): boolean {
  return request.purpose.length === 1 && request.purpose[0] === purpose;
}

/** Claim adjudication outcome derived from latest_response totals. */
export type ClaimOutcome =
  | "pending"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "queried"
  | "cancelled";

export function deriveClaimOutcome(claim: Claim): ClaimOutcome {
  if (claim.status === "cancelled") return "cancelled";

  const response = claim.latest_response;
  if (!response) return "pending";

  if (response.outcome === "queued") return "queried";

  const totalRequested =
    claim.item?.reduce(
      (sum, item) => sum + item.unit_price * item.quantity.value,
      0
    ) ?? 0;

  const totalApproved =
    response.item?.reduce(
      (sum, item) => sum + (item.adjudication?.[0]?.amount?.value ?? 0),
      0
    ) ?? 0;

  if (totalApproved === 0) return "rejected";
  if (totalApproved >= totalRequested) return "approved";
  return "partially-approved";
}

export type TimelineRecord =
  | { kind: "ce"; record: CoverageEligibilityRequest; createdAt: number }
  | { kind: "claim"; record: Claim; createdAt: number };

export function buildTimeline(
  coverages: CoverageEligibilityRequest[],
  claims: Claim[]
): TimelineRecord[] {
  const records: TimelineRecord[] = [
    ...coverages.map<TimelineRecord>((record) => ({
      kind: "ce",
      record,
      createdAt: new Date(record.created_date).getTime(),
    })),
    ...claims.map<TimelineRecord>((record) => ({
      kind: "claim",
      record,
      createdAt: new Date(record.created_date).getTime(),
    })),
  ];

  return records.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns true when no follow-up Coverage Eligibility (validation) or claim
 * has been created after the supplied timeline record. Used to decide whether
 * a card should still show "next step" actions or just historical state.
 */
export function isLatestRecord(
  timeline: TimelineRecord[],
  target: TimelineRecord
): boolean {
  if (timeline.length === 0) return false;
  // Timeline is sorted descending (latest first), so index 0 is the most recent.
  const latestEntry = timeline[0];
  if (target.kind !== latestEntry.kind) return false;
  if (target.kind === "ce" && latestEntry.kind === "ce") {
    return target.record.id === latestEntry.record.id;
  }
  if (target.kind === "claim" && latestEntry.kind === "claim") {
    return target.record.id === latestEntry.record.id;
  }
  return false;
}
