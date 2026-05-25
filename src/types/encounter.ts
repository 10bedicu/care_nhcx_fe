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
export interface EncounterCareTeam {
  member: User;
  role: Coding;
}

export type Encounter = {
  id: string;
  patient: Patient;
  facility: Facility;
  encounter_class: EncounterClass;
  care_team: EncounterCareTeam[];
  period: Period;

  [key: string]: unknown;
};
