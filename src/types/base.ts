import { Condition } from "@/types/condition";

export type Coding = {
  system: string;
  code: string;
  display?: string;
};

export type Period = {
  start?: string;
  end?: string;
};

export type CodableConcept = {
  coding?: Coding[];
  text?: string;
};

export type HcxError = {
  code: CodableConcept;
  expression?: string;
};

export type Quantity = {
  value: number;
  unit?: Coding;
};

export enum MonetaryComponentType {
  base = "base",
  discount = "discount",
  tax = "tax",
  surcharge = "surcharge",
  informational = "informational",
}

export interface MonetaryComponent {
  monetary_component_type: MonetaryComponentType;
  code?: Coding;
  factor?: string | null;
  amount?: string | null;
  tax_included_amount?: string;
  conditions?: Condition[];
  global_component?: boolean;
}

export interface SlugConfig {
  facility?: string;
  slug_value: string;
}
