import {
  CodeableConcept,
  CommunicationRequestPayload,
} from "@medplum/fhirtypes";

import { Coding } from "./base";
import { FileUpload } from "./file_upload";
import { User } from "./user";

export const COMMUNICATION_STATUS_CHOICES = [
  "preparation",
  "in-progress",
  "not-done",
  "on-hold",
  "stopped",
  "completed",
  "entered-in-error",
  "unknown",
] as const;
export type CommunicationStatusChoice =
  (typeof COMMUNICATION_STATUS_CHOICES)[number];

export const COMMUNICATION_PRIORITY_CHOICES = [
  "routine",
  "urgent",
  "asap",
  "stat",
] as const;
export type CommunicationPriorityChoice =
  (typeof COMMUNICATION_PRIORITY_CHOICES)[number];

export type CommunicationPayload = {
  content_string?: string;
  content_attachment?: FileUpload;
};

export type Communication = {
  id: string;
  status: CommunicationStatusChoice;
  priority?: CommunicationPriorityChoice;
  category: Coding[];
  sent?: string;
  payload: CommunicationPayload[];

  based_on: string;
  part_of: string;
  about: string;
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};

export type CommunicationRequest = {
  id: string;
  identifier: string;
  status: string;
  priority?: string | null;
  category: CodeableConcept[];
  authored_on?: string;
  payload: CommunicationRequestPayload[];
  replaces?: string;
  based_on: string;
  about: string;

  created_date: string;
  modified_date?: string;
};
