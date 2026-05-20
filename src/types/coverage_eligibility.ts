import { Coding, Quantity } from "./base";

import { ChargeItem } from "./charge_item";
import { Condition } from "./condition";
import { FileUpload } from "./file_upload";
import { Participant } from "./participant";
import { Policy } from "./policy";
import { User } from "./user";

export const COVERAGE_ELIGIBILITY_REQUEST_STATUS_CHOICES = [
  "active",
  "cancelled",
  "draft",
  "entered-in-error",
] as const;
export type CoverageEligibilityRequestStatusChoice =
  (typeof COVERAGE_ELIGIBILITY_REQUEST_STATUS_CHOICES)[number];

export const COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES = [
  "stat",
  "normal",
  "deferred",
] as const;
export type CoverageEligibilityRequestPriorityChoice =
  (typeof COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES)[number];

export const COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES = [
  "auth-requirements",
  "benefits",
  "discovery",
  "validation",
] as const;
export type CoverageEligibilityRequestPurposeChoice =
  (typeof COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES)[number];

export type CoverageEligibilityRequestSupportingInfo = {
  sequence: number;
  value_string?: string;
  value_attachment?: FileUpload;
};

export type CoverageEligibilityRequestInsurance = {
  sequence: number;
  focal: boolean;
  policy: Policy;
};

export type CoverageEligibilityRequestItemDiagnosis = {
  diagnosis_reference?: Condition;
  diagnosis_code: Coding;
};

export type CoverageEligibilityRequestItem = {
  sequence: number;
  supporting_info_sequence: number[];
  category: Coding;
  product_or_service: Coding;
  charge_item?: ChargeItem;
  modifier?: Coding[];
  quantity: Quantity;
  unit_price: number;
  diagnosis: CoverageEligibilityRequestItemDiagnosis[];
};

export type Money = {
  value: number;
  currency: string;
};

export type Balance = {
  allowed: Money;
  used: Money;
};

export type ProcedureDocument = {
  code: string;
  display: string;
};

export type ProcedureQuestionnaire = {
  id: string;
  display: string;
  url: string;
};

export type EligibilityProcedure = {
  code: string;
  display: string | null;
  category: { code: string; display: string } | null;
  excluded: boolean;
  allowed_amount: Money | null;
  authorization_required: boolean;
  required_documents: ProcedureDocument[];
  required_questionnaires: ProcedureQuestionnaire[];
};

export type InsuranceEntry = {
  pmjay_id: string;
  is_primary: boolean;
  name: string | null;
  dob: string | null;
  gender: string | null;
  abha_id: string | null;
  inforce: boolean;
  plan_name: string | null;
  plan_id: string | null;
  policy_period: { start: string; end: string } | null;
  balance: Balance | null;
  procedure: EligibilityProcedure | null;
};

export type CoverageEligibilityResponse = {
  id: string;
  outcome: "complete" | "error" | "partial" | "queued";
  disposition: string | null;
  insurances: InsuranceEntry[] | null;
  error: object | null;
  created_date: string;
};

export type CoverageEligibilityRequest = {
  id: string;
  status: CoverageEligibilityRequestStatusChoice;
  priority: CoverageEligibilityRequestPriorityChoice;
  purpose: CoverageEligibilityRequestPurposeChoice[];
  provider: string; // uuid
  patient: string; // uuid
  encounter?: string; // uuid
  insurer: Participant;
  supporting_info: CoverageEligibilityRequestSupportingInfo[];
  insurance: CoverageEligibilityRequestInsurance[];
  item: CoverageEligibilityRequestItem[];

  latest_response: CoverageEligibilityResponse | null;
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};
