import { format, formatDistanceToNow } from "date-fns";

import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { VALIDATION_REUSE_WINDOW_HOURS } from "./constants";

export function getVerificationTimestamp(
  request: CoverageEligibilityRequest,
): string {
  return (
    request.latest_response?.created_date ??
    request.dispatched_at ??
    request.created_date
  );
}

export function isValidationStale(
  request: CoverageEligibilityRequest,
  hours: number = VALIDATION_REUSE_WINDOW_HOURS,
): boolean {
  const timestamp = getVerificationTimestamp(request);
  const ageMs = Date.now() - new Date(timestamp).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

export function formatVerificationTimestamp(
  request: CoverageEligibilityRequest,
): string {
  const date = new Date(getVerificationTimestamp(request));
  const ageMs = Date.now() - date.getTime();

  if (ageMs < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, "MMM d, yyyy 'at' h:mm a");
}
