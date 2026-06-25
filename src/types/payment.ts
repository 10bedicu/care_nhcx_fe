import {
  Money,
  PaymentReconciliationDetail,
  PaymentReconciliationProcessNote,
  Period,
} from "@medplum/fhirtypes";

/** Billing-side reconciliation (care emr `PaymentReconciliation`). */
export type EMRPaymentReconciliation = {
  id: string;
  reconciliation_type: string;
  status: string;
  kind: string;
  issuer_type: string;
  outcome: string;
  disposition?: string | null;
  payment_datetime?: string | null;
  method: string;
  reference_number?: string | null;
  authorization?: string | null;
  note?: string | null;
  amount?: number | null;
  tendered_amount: number;
  returned_amount: number;
  is_credit_note: boolean;
  account?: Record<string, unknown>;
  target_invoice?: Record<string, unknown> | null;
  created_date: string;
  modified_date: string;
};

export type PaymentNotice = {
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
  payment_reconciliation?: EMRPaymentReconciliation | null;

  created_date: string;
  modified_date: string;
};
