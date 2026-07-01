export const VALIDATION_REUSE_WINDOW_HOURS = 3;

export function validationCreatedAfterIso(
  hours: number = VALIDATION_REUSE_WINDOW_HOURS,
): string {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return cutoff.toISOString();
}
