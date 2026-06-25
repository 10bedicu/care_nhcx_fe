import { Coding, MonetaryComponent } from "@/types/base";

import { ChargeItemDefinition } from "@/types/charge_item_definition";
import { Invoice } from "@/types/invoice";
import { User } from "@/types/user";

export enum ChargeItemStatus {
  billable = "billable",
  not_billable = "not_billable",
  aborted = "aborted",
  billed = "billed",
  paid = "paid",
  entered_in_error = "entered_in_error",
}

export enum DiscountApplicabilityOrder {
  total_desc = "total_desc",
  total_asc = "total_asc",
}

export enum ChargeItemServiceResource {
  service_request = "service_request",
  medication_dispense = "medication_dispense",
  appointment = "appointment",
  bed_association = "bed_association",
}

export interface DiscountConfiguration {
  max_applicable: number;
  applicability_order: DiscountApplicabilityOrder;
}

export interface ChargeItem {
  id: string;
  title: string;
  description?: string;
  code: Coding;
  status: ChargeItemStatus;
  quantity: string;
  unit_price_components: MonetaryComponent[];
  note?: string;
  override_reason?: Omit<Coding, "system">;
  total_price: string;
  paid_invoice?: Invoice;
  total_price_components: MonetaryComponent[];
  discount_configuration: DiscountConfiguration | null;
  charge_item_definition: ChargeItemDefinition;
  service_resource: ChargeItemServiceResource;
  service_resource_id?: string;
  performer_actor?: User;
  created_date: string;
  modified_date: string;
  created_by: User;
  updated_by: User;
}
