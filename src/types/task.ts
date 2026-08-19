import { CodeableConcept, TaskInput, TaskOutput } from "@medplum/fhirtypes";
import { Communication, CommunicationRequest } from "./communication";

import { ClaimResponse } from "./claim";
import { PaymentNotice } from "./payment";
import { User } from "./user";

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
  dispatch_status: "pending" | "awaiting" | "complete" | "error";
  dispatched_at: string | null;
  dispatch_error: string;
  use_case:
    | "communication_request"
    | "communication_response"
    | "payment_notice_request"
    | "payment_notice_response"
    | "reprocess_request"
    | "reprocess_response"
    | "cancel_request"
    | "cancel_response"
    | "insurance_plan_request"
    | "search_request"
    | "search_response";
  created_date: string;
  modified_date?: string;
  created_by: User;
  updated_by?: User;
};

export type CommunicationRequestTask = TaskBase & {
  use_case: "communication_request";
  focus: CommunicationRequest;
};

export type CommunicationTask = TaskBase & {
  use_case: "communication_response";
  focus: Communication;
};

export type PaymentNoticeTask = TaskBase & {
  use_case: "payment_notice_request";
  focus: PaymentNotice;
};

export type ProcessAcknowledgementTask = TaskBase & {
  use_case: "payment_notice_response";
  focus: undefined;
};

export type ReprocessRequestTask = TaskBase & {
  use_case: "reprocess_request";
  focus: undefined;
};

export type ReprocessResponseTask = TaskBase & {
  use_case: "reprocess_response";
  focus: ClaimResponse;
};

export type CancelRequestTask = TaskBase & {
  use_case: "cancel_request";
  focus: undefined;
};

export type CancelResponseTask = TaskBase & {
  use_case: "cancel_response";
  focus: ClaimResponse;
};

export type Task =
  | CommunicationRequestTask
  | CommunicationTask
  | PaymentNoticeTask
  | ProcessAcknowledgementTask
  | ReprocessRequestTask
  | ReprocessResponseTask
  | CancelRequestTask
  | CancelResponseTask;
