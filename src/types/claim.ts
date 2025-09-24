import {
  ClaimResponseAddItem,
  ClaimResponseError,
  ClaimResponseItem,
  ClaimResponseTotal,
} from "@medplum/fhirtypes";
import { Coding, Period, Quantity } from "./base";

import { ChargeItem } from "./charge_item";
import { Condition } from "./condition";
import { FileUpload } from "./file_upload";
import { Participant } from "./participant";
import { Policy } from "./policy";
import { Procedure } from "./procedure";
import { User } from "./user";

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
  "yes",
  "no",
  "unknown",
] as const;
export type ClaimDiagnosisOnAdmissionChoice =
  (typeof CLAIM_DIAGNOSIS_ON_ADMISSION_CHOICES)[number];

export type ClaimRelated = {
  claim: Claim;
  relationship?: Coding;
  reference?: string;
};

export type ClaimCareTeam = {
  sequence: number;
  provider: User;
  responsible?: boolean;
  role?: Coding;
};

export type ClaimSupportingInfo = {
  sequence: number;
  category: Coding;
  code: Coding;
  timing?: Period;
  value_string?: string;
  value_attachment?: FileUpload;
};

export type ClaimProcedure = {
  sequence: number;
  type: Coding[];
  date?: string;
  procedure_reference?: Procedure;
  procedure_code: Coding;
};

export type ClaimDiagnosis = {
  sequence: number;
  type: Coding[];
  diagnosis_reference?: Condition;
  diagnosis_code: Coding;
  on_admission?: ClaimDiagnosisOnAdmissionChoice;
};

export type ClaimInsurance = {
  sequence: number;
  focal: boolean;
  policy: Policy;
};

export type ClaimItem = {
  sequence: number;
  care_team_sequence: number[];
  diagnosis_sequence: number[];
  procedure_sequence: number[];
  information_sequence: number[];
  category?: Coding;
  product_or_service: Coding;
  charge_item?: ChargeItem;
  program_code: Coding[];
  serviced_period?: Period;
  quantity: Quantity;
  unit_price: number;
  factor?: number;
};

export type ClaimAccident = {
  date: string;
  type?: Coding;
  location?: string;
};

export type ClaimPayee = unknown;

export type ClaimResponse = {
  outcome: string;
  disposition?: string;
  item?: ClaimResponseItem[];
  add_item?: ClaimResponseAddItem[];
  total?: ClaimResponseTotal[];
  error?: ClaimResponseError[];
  request: string; // uuid
  created_date: string;
  modified_date?: string;
};

export type Claim = {
  id: string;
  claim_flow_id: string;
  use: ClaimUseChoice;
  status: ClaimStatusChoice;
  priority: ClaimPriorityChoice;
  type: Coding;
  provider: string; // uuid
  patient: string; // uuid
  encounter?: string; // uuid
  insurer: Participant;
  billable_period?: Period;
  related: ClaimRelated[];
  care_team: ClaimCareTeam[];
  supporting_info: ClaimSupportingInfo[];
  procedure: ClaimProcedure[];
  diagnosis: ClaimDiagnosis[];
  insurance: ClaimInsurance[];
  item: ClaimItem[];
  accident?: ClaimAccident;
  payee?: ClaimPayee;
  latest_response?: ClaimResponse;
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};
