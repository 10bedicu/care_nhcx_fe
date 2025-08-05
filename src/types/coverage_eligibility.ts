import { Coding, Quantity } from "./base";
import {
  CoverageEligibilityResponseError,
  CoverageEligibilityResponseInsurance,
} from "@medplum/fhirtypes";

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
  focal: boolean;
  policy: Policy;
};

export type CoverageEligibilityRequestItemDiagnosis = {
  diagnosis_reference?: Condition;
  diagnosis_code: Coding;
};

export type CoverageEligibilityRequestItem = {
  supporting_info_sequence: number[];
  category: Coding;
  product_or_service: Coding;
  charge_item?: ChargeItem;
  quantity: Quantity;
  unit_price: number;
  diagnosis: CoverageEligibilityRequestItemDiagnosis[];
};

export type CoverageEligibilityResponse = {
  outcome: string;
  disposition?: string;
  insurance?: CoverageEligibilityResponseInsurance[];
  error?: CoverageEligibilityResponseError[];
  request: string; // uuid
  created_date: string;
  modified_date?: string;
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

  latest_response?: CoverageEligibilityResponse;
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};
