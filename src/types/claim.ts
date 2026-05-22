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
  modifier?: Coding[];
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

export type ClaimQuestionnaireResponseAnswer = {
  value_boolean?: boolean;
  value_decimal?: number;
  value_integer?: number;
  value_date?: string;
  value_date_time?: string;
  value_time?: string;
  value_string?: string;
  value_uri?: string;
  value_coding?: Coding;
  value_quantity?: { value: number; unit?: string };
  value_attachment?: string;
};

export type ClaimQuestionnaireResponseItem = {
  link_id: string;
  text?: string;
  answer: ClaimQuestionnaireResponseAnswer[];
  item?: ClaimQuestionnaireResponseItem[];
};

export type ClaimQuestionnaireResponse = {
  sequence: number;
  questionnaire: string;
  category: Coding;
  code: Coding;
  item: ClaimQuestionnaireResponseItem[];
};

export type ClaimPayee = unknown;

export type ClaimResponseErrorEntry = ClaimResponseError & {
  expression?: string[];
};

export type ClaimResponseAdjudication = {
  category: { coding: Coding[] };
  amount?: { value: number; currency?: string };
  value?: number;
  reason?: { coding: Coding[] };
};

export type ClaimResponseIdentifier = {
  type: { coding: Coding[] };
  value: string;
  system?: string;
};

export type ClaimResponse = {
  id?: string;
  request: string; // uuid
  use?: "preauthorization" | "claim" | "predetermination" | null;
  status?: "active" | "cancelled" | null;
  pre_auth_ref?: string | null;
  adjudication?: ClaimResponseAdjudication[] | null;
  identifier?: ClaimResponseIdentifier[] | null;
  type?: { coding: Coding[] } | null;
  outcome: string;
  disposition?: string | null;
  item?: ClaimResponseItem[];
  add_item?: ClaimResponseAddItem[];
  total?: ClaimResponseTotal[];
  error?: ClaimResponseErrorEntry[];
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
  questionnaire_responses?: ClaimQuestionnaireResponse[];
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};
