import { Coding, Period } from "@/types/base";

import { Facility } from "@/types/facility";
import { Patient } from "@/types/patient";
import { User } from "@/types/user";

export enum EncounterClass {
  inpatient = "imp",
  outpatient = "amb",
  observation = "obsenc",
  emergency = "emer",
  virtual = "vr",
  home = "hh",
}

export const ENCOUNTER_ADMIT_SOURCE = [
  "hosp_trans",
  "emd",
  "outp",
  "born",
  "gp",
  "mp",
  "nursing",
  "psych",
  "rehab",
  "other",
] as const;

export const ENCOUNTER_CLASS = [
  "imp",
  "amb",
  "obsenc",
  "emer",
  "vr",
  "hh",
] as const;

export const ENCOUNTER_DIET_PREFERENCE = [
  "vegetarian",
  "dairy_free",
  "nut_free",
  "gluten_free",
  "vegan",
  "halal",
  "kosher",
  "none",
] as const;

export const ENCOUNTER_DISCHARGE_DISPOSITION = [
  "home",
  "other_hcf",
  "aadvice",
  "exp",
  "alt_home",
  "hosp",
  "long",
  "psy",
  "rehab",
  "snf",
  "oth",
] as const;

export const ENCOUNTER_PRIORITY = [
  "stat",
  "ASAP",
  "emergency",
  "urgent",
  "routine",
  "elective",
  "rush_reporting",
  "timing_critical",
  "callback_results",
  "callback_for_scheduling",
  "preop",
  "as_needed",
  "use_as_directed",
] as const;

export enum EncounterStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  ON_HOLD = "on_hold",
  DISCHARGED = "discharged",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DISCONTINUED = "discontinued",
  ENTERED_IN_ERROR = "entered_in_error",
  UNKNOWN = "unknown",
}

export type EncounterPriority = (typeof ENCOUNTER_PRIORITY)[number];

export type EncounterAdmitSources = (typeof ENCOUNTER_ADMIT_SOURCE)[number];

export type EncounterDietPreference =
  (typeof ENCOUNTER_DIET_PREFERENCE)[number];

export type EncounterDischargeDisposition =
  (typeof ENCOUNTER_DISCHARGE_DISPOSITION)[number];

export type Hospitalization = {
  re_admission?: boolean;
  admit_source?: EncounterAdmitSources;
  discharge_disposition?: EncounterDischargeDisposition;
  diet_preference?: EncounterDietPreference;
};

export type EncounterCareTeam = {
  member: User;
  role: Coding;
};

export type Encounter = {
  id: string;
  patient: Patient;
  facility: Facility;
  encounter_class: EncounterClass;
  care_team: EncounterCareTeam[];
  period: Period;
  status: EncounterStatus;
  priority?: EncounterPriority;
  hospitalization?: Hospitalization | null;

  [key: string]: unknown;
};
