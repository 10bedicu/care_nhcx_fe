export type ClaimConsentStage = "preauthorization" | "claim";

export type ClaimConsent = {
  id?: string;
  created_date?: string;
  modified_date?: string;
  stage: ClaimConsentStage;
  payer_id: string;
  encounter?: string;
  patient?: string;
  expires_in: number;
  refresh_expires_in: number;
  accounts: Record<string, unknown>[];
};
