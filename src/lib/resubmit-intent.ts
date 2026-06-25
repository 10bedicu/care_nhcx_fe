/**
 * Remembers, across the CE form -> encounter timeline -> claim form navigation,
 * that the user chose to update items "as resubmit". The claim form reads this
 * to default its submit action to "Resubmit". Scoped per encounter and kept in
 * sessionStorage so it survives page navigations but not a new browser session.
 */

const intentKey = (encounterId: string) => `nhcx:resubmit-intent:${encounterId}`;

export function setResubmitIntent(encounterId: string): void {
  if (!encounterId) return;
  try {
    sessionStorage.setItem(intentKey(encounterId), "1");
  } catch {
    // Ignore storage failures (e.g. disabled/full storage).
  }
}

export function hasResubmitIntent(encounterId: string): boolean {
  if (!encounterId) return false;
  try {
    return sessionStorage.getItem(intentKey(encounterId)) === "1";
  } catch {
    return false;
  }
}

export function clearResubmitIntent(encounterId: string): void {
  if (!encounterId) return;
  try {
    sessionStorage.removeItem(intentKey(encounterId));
  } catch {
    // Ignore storage failures.
  }
}
