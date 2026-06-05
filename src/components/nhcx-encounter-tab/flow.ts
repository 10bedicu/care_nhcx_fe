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

/** True when the payer returned a usable adjudication response (not a dispatch/submission failure). */
export function hasSuccessfulPayerResponse(claim: Claim): boolean {
  if (claim.dispatch_status === "error") return false;
  const response = claim.latest_response;
  if (!response) return false;
  if (response.outcome === "error") return false;
  return true;
}

function sortClaimsByCreatedDesc(claims: Claim[]): Claim[] {
  return claims
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
}

/** Most recent claim on the encounter (by created_date). */
export function findLatestClaim(claims: Claim[]): Claim | undefined {
  return sortClaimsByCreatedDesc(claims)[0];
}

/** Most recent claim that received a successful payer response. */
export function findLatestClaimWithSuccessfulResponse(
  claims: Claim[]
): Claim | undefined {
  return sortClaimsByCreatedDesc(claims).find(hasSuccessfulPayerResponse);
}

export function deriveClaimOutcome(claim: Claim): ClaimOutcome {
  if (claim.status === "cancelled") return "cancelled";

  const response = claim.latest_response;
  if (!response) return "pending";

  const statusEntry = response.adjudication?.find(
    (a) => a.category?.coding?.[0]?.code === "status",
  );
  const adjCode = statusEntry?.reason?.coding?.[0]?.code?.toLowerCase();

  // "approved" reason — refine by comparing requested vs approved amounts.
  if (adjCode === "approved") {
    const totalRequested = getRequestedTotal(claim);
    const totalApproved = getApprovedTotal(claim);

    if (totalApproved === 0) return "rejected";
    if (totalApproved < totalRequested) return "partially-approved";
    return "approved";
  }

  if (adjCode?.includes("partial")) {
    return "partially-approved";
  }
  if (adjCode === "queried") return "queried";
  if (adjCode === "rejected") return "rejected";

  // outcome === "queued" means the payer has acknowledged but not yet
  // adjudicated — treat as still pending, not queried.
  if (response.outcome === "queued") return "pending";

  // Amount-based fallback when adjudication has no recognised status reason.
  const totalRequested = getRequestedTotal(claim);
  const totalApproved = getApprovedTotal(claim);

  if (totalApproved === 0) return "rejected";
  if (totalApproved >= totalRequested) return "approved";
  return "partially-approved";
}

/** Sum a specific adjudication category across `response.item[*].adjudication`. */
function sumItemAdjudicationByCode(
  response: Claim["latest_response"],
  code: string,
): number {
  return (
    response?.item?.reduce((sum, item) => {
      const entry = item.adjudication?.find(
        (a) => a.category?.coding?.[0]?.code === code,
      );
      return sum + (entry?.amount?.value ?? 0);
    }, 0) ?? 0
  );
}

/** Look up a total at the response level by its category code. */
function getResponseTotal(
  response: Claim["latest_response"],
  code: string,
): number | null {
  const entry = response?.total?.find(
    (t) => t.category?.coding?.[0]?.code === code,
  );
  return entry?.amount?.value ?? null;
}

/**
 * Amount requested by the provider. Prefers the payer's echoed
 * `total[submitted]`, then the per-item submitted adjudication sum, and
 * finally the local claim line math (unit_price × quantity).
 */
function getRequestedTotal(claim: Claim): number {
  const response = claim.latest_response;
  const fromTotal = getResponseTotal(response, "submitted");
  if (fromTotal !== null) return fromTotal;

  const fromItems = sumItemAdjudicationByCode(response, "submitted");
  if (fromItems > 0) return fromItems;

  return (
    claim.item?.reduce(
      (sum, item) => sum + item.unit_price * item.quantity.value,
      0,
    ) ?? 0
  );
}

/**
 * Amount approved (payable) by the payer. Prefers the response-level
 * `total[benefit]` (the amount the payer will actually pay), then
 * `total[eligible]`, then per-item `eligible` adjudication sums.
 */
function getApprovedTotal(claim: Claim): number {
  const response = claim.latest_response;

  const benefit = getResponseTotal(response, "benefit");
  if (benefit !== null) return benefit;

  const eligible = getResponseTotal(response, "eligible");
  if (eligible !== null) return eligible;

  return sumItemAdjudicationByCode(response, "eligible");
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
