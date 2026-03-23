import { Coding } from "./base";
import { User } from "./user";

export enum ConditionClinicalStatus {
  active = "active",
  resolved = "resolved",
  inactive = "inactive",
  recurrence = "recurrence",
  relapse = "relapse",
  remission = "remission",
  unknown = "unknown",
}

export enum ConditionVerificationStatus {
  confirmed = "confirmed",
  unconfirmed = "unconfirmed",
  refuted = "refuted",
  entered_in_error = "entered_in_error",
  provisional = "provisional",
  differential = "differential",
}

export enum ConditionCategory {
  problem_list_item = "problem_list_item",
  encounter_diagnosis = "encounter_diagnosis",
  chronic_condition = "chronic_condition",
}

export enum ConditionSeverity {
  mild = "mild",
  moderate = "moderate",
  severe = "severe",
}

export type Condition = {
  id: string;
  clinical_status: ConditionClinicalStatus;
  verification_status: ConditionVerificationStatus;
  category: ConditionCategory;
  severity: ConditionSeverity;
  code: Coding;
  encounter: string;
  onset: {
    onset_datetime?: string;
    onset_age?: number;
    onset_string?: string;
    note?: string;
  };
  abatement: {
    abatement_datetime?: string;
    abatement_age?: number;
    abatement_string?: string;
    note?: string;
  };
  note?: string;

  created_by: User;
  updated_by: User;
};
