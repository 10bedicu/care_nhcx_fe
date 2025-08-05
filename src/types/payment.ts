import {
  Money,
  PaymentReconciliationDetail,
  PaymentReconciliationProcessNote,
  Period,
} from "@medplum/fhirtypes";

export type PaymentReconciliation = {
  id: string;

  identifier: string;
  status: string;
  period: Period;
  outcome?: string;
  disposition?: string;
  payment_date: string;
  payment_amount: Money;
  payment_identifier?: string;
  detail?: PaymentReconciliationDetail[];
  process_note?: PaymentReconciliationProcessNote[];
  request: string;
  claim: string;

  created_date: string;
  modified_date: string;
};
