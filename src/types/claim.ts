import { Coding, HcxError, Period } from "./base";

import { Condition } from "./condition";
import { Coverage } from "./coverage_eligibility";
import { FileUpload } from "./file_upload";
import { Policy } from "./policy";
import { User } from "./user";

// Enums for claim choices
export const CLAIM_USE_CHOICES = [
  "claim",
  "preauthorization",
  "predetermination",
] as const;
export type ClaimUseChoice = (typeof CLAIM_USE_CHOICES)[number];

export const CLAIM_STATUS_CHOICES = [
  "active",
  "cancelled",
  "draft",
  "entered-in-error",
] as const;
export type ClaimStatusChoice = (typeof CLAIM_STATUS_CHOICES)[number];

export const CLAIM_PRIORITY_CHOICES = ["stat", "normal", "deferred"] as const;
export type ClaimPriorityChoice = (typeof CLAIM_PRIORITY_CHOICES)[number];

export const CLAIM_DIAGNOSIS_ON_ADMISSION_CHOICES = [
  "y",
  "n",
  "u",
  "w",
] as const;
export type ClaimDiagnosisOnAdmissionChoice =
  (typeof CLAIM_DIAGNOSIS_ON_ADMISSION_CHOICES)[number];

// Legacy types for backward compatibility
export const CLAIM_TYPES = [
  "institutional",
  "oral",
  "pharmacy",
  "professional",
  "vision",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_USES = CLAIM_USE_CHOICES;
export type ClaimUse = ClaimUseChoice;

export const CLAIM_STATUSES = CLAIM_STATUS_CHOICES;
export type ClaimStatus = ClaimStatusChoice;

export const CLAIM_PRIORITIES = CLAIM_PRIORITY_CHOICES;
export type ClaimPriority = ClaimPriorityChoice;

export const CLAIM_RELATED_RELATIONSHIPS = [
  "enhancement",
  "settlement",
  "prior",
  "associated",
] as const;
export type ClaimRelatedRelationshipChoice =
  (typeof CLAIM_RELATED_RELATIONSHIPS)[number];

// Base types for claim components
export type ClaimCareTeamSpec = {
  sequence: number;
  provider: string; // UUID4
  responsible?: boolean;
  role?: Coding;
};

export type ClaimDiagnosisSpec = {
  sequence: number;
  type?: Coding;
  diagnosis_reference?: string; // UUID4
  diagnosis_code?: Coding;
  on_admission?: ClaimDiagnosisOnAdmissionChoice;
};

export type ClaimProcedureSpec = {
  sequence: number;
  type?: Coding;
  date?: string; // datetime
  procedure_reference?: string; // UUID4
  procedure_code?: Coding;
};

export type ClaimRelatedSpec = {
  claim: string; // UUID4
  relationship?: Coding;
  reference?: string;
};

export type ClaimInsuranceSpec = {
  sequence: number;
  focal: boolean;
  policy: Policy;
};

export type ClaimSupportingInfoSpec = {
  sequence: number;
  category: Coding;
  code: Coding;
  timing?: Period;
  value_string?: string;
  value_attachment?: string; // UUID4
};

export type Quantity = {
  value: number;
  unit?: string;
};

export type ClaimItemSpec = {
  sequence: number;
  care_team_sequence: number[];
  diagnosis_sequence: number[];
  procedure_sequence: number[];
  information_sequence: number[];
  category?: Coding;
  product_or_service?: Coding;
  charge_item?: string; // UUID4
  program_code: Coding[];
  serviced_period?: Period;
  quantity?: Quantity;
  unit_price?: number; // float in INR
  factor?: number; // float
};

export type ClaimAccidentSpec = {
  date: string; // datetime
  type?: Coding;
  location?: string;
};

export type ClaimPayeeSpec = Record<string, unknown>;

// Claim Create Specification
export type ClaimCreateSpec = {
  use: ClaimUseChoice;
  status: ClaimStatusChoice;
  priority: ClaimPriorityChoice;
  type: Coding;
  facility: string; // UUID4
  patient: string; // UUID4
  encounter?: string; // UUID4
  billable_period?: Period;
  related: ClaimRelatedSpec[];
  care_team: ClaimCareTeamSpec[];
  supporting_info: ClaimSupportingInfoSpec[];
  procedure: ClaimProcedureSpec[];
  diagnosis: ClaimDiagnosisSpec[]; // min_length=1
  insurance: ClaimInsuranceSpec[]; // min_length=1
  item: ClaimItemSpec[]; // min_length=1
  accident?: ClaimAccidentSpec;
  payee?: ClaimPayeeSpec;
};

// Claim Response Retrieve Specification
export type ClaimResponseRetrieveSpec = {
  outcome: string;
  disposition?: string;
  item?: Record<string, unknown>;
  add_item?: Record<string, unknown>;
  total?: Record<string, unknown>;
  error?: Record<string, unknown>;
  meta: Record<string, unknown>;
};

// Claim Retrieve Specification
export type ClaimRetrieveSpec = {
  id: string; // UUID4
  use: string;
  status: string;
  priority: string;
  type?: Record<string, unknown>;
  insurer: Record<string, unknown>;
  billable_period?: Record<string, unknown>;
  related: Record<string, unknown>[];
  care_team: Record<string, unknown>[];
  supporting_info: Record<string, unknown>[];
  procedure: Record<string, unknown>[];
  diagnosis: Record<string, unknown>[];
  insurance: Record<string, unknown>[];
  item: Record<string, unknown>[];
  accident?: Record<string, unknown>;
  payee?: Record<string, unknown>;
  provider: string; // UUID4
  patient: string; // UUID4
  encounter: string; // UUID4
  latest_response?: Record<string, unknown>;
  created_by?: Record<string, unknown>;
  updated_by?: Record<string, unknown>;
};

// Legacy types for backward compatibility
export type ClaimInsurance = {
  sequence: number;
  focal?: boolean;
  coverage: Coverage;
};

export type ClaimRelated = {
  claim: Claim;
  relationship: ClaimRelatedRelationshipChoice;
};

export type ClaimCareTeam = {
  sequence: number;
  provider: User;
  responsible?: boolean;
};

export type ClaimDiagnosis = {
  sequence: number;
  diagnosis: Condition;
};

export type ClaimProcedure = {
  sequence: number;
  procedure: unknown;
  date?: string;
};

export type ClaimSupportingInfo = {
  sequence: number;
  category: Coding;
  value?: string;
  attachment?: FileUpload;
};

export type ClaimItem = {
  sequence: number;
  care_team_sequence: number[];
  diagnosis_sequence: number[];
  procedure_sequence: number[];
  information_sequence: number[];
  category?: Coding;
  product_or_service: Coding;
  quantity: number;
  unit_price: number;
  patient_paid?: number;
  tax?: number;
  net?: number;
};

export type Claim = {
  id: string;
  type: ClaimType;
  use: ClaimUse;
  status: ClaimStatus;
  priority: ClaimPriority;
  encounter: string;
  insurance: ClaimInsurance[];
  related?: ClaimRelated[];
  care_team?: ClaimCareTeam[];
  diagnosis?: ClaimDiagnosis[];
  procedure?: ClaimProcedure[];
  supporting_info?: ClaimSupportingInfo[];
  item?: ClaimItem[];
  billable_period?: Period;
  patient_paid?: number;
  total?: number;
  latest_claim_response?: ClaimResponse;
  created_date: string;
  modified_date: string;
  created_by?: User;
  updated_by?: User;
  latest_response?: Record<string, unknown>;
};

export const CLAIM_RESPONSE_OUTCOME = [
  "complete",
  "error",
  "partial",
  "queued",
] as const;
export type CoverageEligibilityResponseOutcome =
  (typeof CLAIM_RESPONSE_OUTCOME)[number];

export type ClaimResponse = {
  id: string;
  request: Claim;
  outcome: CoverageEligibilityResponseOutcome;
  disposition?: string;
  error?: HcxError;
  total_amount?: number;
  created_date: string;
  modified_date: string;
};

export const getClaimApprovalStatus = (claim?: Claim) => {
  if (!claim) return "pending";

  console.log(claim.latest_claim_response);

  if (
    claim.latest_claim_response?.outcome === "error" ||
    claim.latest_claim_response?.error
  ) {
    return "rejected";
  }

  if (claim.latest_claim_response?.outcome === "complete") {
    return "approved";
  }

  return "pending";
};
