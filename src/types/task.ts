import { CodeableConcept, TaskInput, TaskOutput } from "@medplum/fhirtypes";
import { Communication, CommunicationRequest } from "./communication";

export type TaskBase = {
  identifier?: string;
  status: string;
  intent: string;
  priority?: string;
  code?: CodeableConcept;
  authored_on?: string;
  description?: string;
  reason_code?: CodeableConcept;
  input?: TaskInput[];
  output?: TaskOutput[];
  claim: string;
  part_of?: string;
  focus?: unknown;
  use_case: "communication_request" | "communication_response";
};

export type CommunicationRequestTask = TaskBase & {
  use_case: "communication_request";
  focus: CommunicationRequest;
};

export type CommunicationTask = TaskBase & {
  use_case: "communication_response";
  focus: Communication;
};

export type Task = CommunicationRequestTask | CommunicationTask;
