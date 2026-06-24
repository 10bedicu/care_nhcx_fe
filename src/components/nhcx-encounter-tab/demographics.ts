import {
  CoverageEligibilityRequest,
  InsuranceEntry,
} from "@/types/coverage_eligibility";

import { AbhaNumber } from "@/types/abha_number";
import { Patient } from "@/types/patient";

export type DemographicCheckStatus = "match" | "mismatch" | "unknown";

export type DemographicCheck = {
  label: string;
  expected: string;
  received: string;
  status: DemographicCheckStatus;
};

const normalize = (value?: string | null) =>
  (value ?? "").toString().trim().toLowerCase();

const normalizeGender = (value?: string | null) => normalize(value).charAt(0);

const normalizeAbha = (value?: string | null) =>
  (value ?? "").replace(/\D/g, "");

function compare(
  received: string | null | undefined,
  expected: string | null | undefined,
  normalizer: (value?: string | null) => string,
): DemographicCheckStatus {
  if (!received || !expected) return "unknown";
  return normalizer(received) === normalizer(expected) ? "match" : "mismatch";
}

/**
 * Returns the primary insurance entry from a validation response only when the
 * payer has returned a usable (complete/partial) response, otherwise undefined.
 */
export function getValidationDemographicEntry(
  request: CoverageEligibilityRequest,
): InsuranceEntry | undefined {
  const response = request.latest_response;
  if (!response) return undefined;
  if (response.outcome !== "complete" && response.outcome !== "partial") {
    return undefined;
  }
  return (
    response.insurances?.find((entry) => entry.is_primary) ??
    response.insurances?.[0]
  );
}

/**
 * Builds a per-field comparison between the payer-returned demographics and the
 * patient's CARE / ABHA record. Fields the payer did not return are marked
 * "unknown" rather than "mismatch" so missing data never blocks the flow.
 */
export function buildDemographicChecks(
  entry: InsuranceEntry,
  patient?: Patient,
  abhaNumber?: AbhaNumber,
): DemographicCheck[] {
  const checks: DemographicCheck[] = [];

  const expectedName = patient?.name ?? abhaNumber?.name ?? null;
  if (entry.name || expectedName) {
    checks.push({
      label: "Name",
      expected: expectedName ?? "—",
      received: entry.name ?? "—",
      status: compare(entry.name, expectedName, normalize),
    });
  }

  const expectedGender = patient?.gender ?? abhaNumber?.gender ?? null;
  if (entry.gender || expectedGender) {
    checks.push({
      label: "Gender",
      expected: expectedGender ?? "—",
      received: entry.gender ?? "—",
      status: compare(entry.gender, expectedGender, normalizeGender),
    });
  }

  const expectedAbha = abhaNumber?.abha_number ?? null;
  if (entry.abha_id || expectedAbha) {
    checks.push({
      label: "ABHA Number",
      expected: expectedAbha ?? "—",
      received: entry.abha_id ?? "—",
      status: compare(entry.abha_id, expectedAbha, normalizeAbha),
    });
  }

  const expectedDob =
    patient?.date_of_birth ?? abhaNumber?.date_of_birth ?? null;
  if (entry.dob || expectedDob) {
    checks.push({
      label: "Date of Birth",
      expected: expectedDob ?? "—",
      received: entry.dob ?? "—",
      status: compare(entry.dob, expectedDob, normalize),
    });
  }

  return checks;
}

/**
 * True when the payer returned demographics that contradict the patient record
 * on at least one field. Missing payer fields ("unknown") never count as a
 * mismatch.
 */
export function hasDemographicMismatch(
  request: CoverageEligibilityRequest,
  patient?: Patient,
  abhaNumber?: AbhaNumber,
): boolean {
  const entry = getValidationDemographicEntry(request);
  if (!entry) return false;
  return buildDemographicChecks(entry, patient, abhaNumber).some(
    (check) => check.status === "mismatch",
  );
}
