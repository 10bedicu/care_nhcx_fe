import { CodeableConcept } from "@medplum/fhirtypes";

export type InsurancePlanStatus = "draft" | "active" | "retired" | "unknown";

export type BenefitCostQualifierType =
  | "stratification"
  | "implant"
  | "investigation"
  | "medicine"
  | "other";

export type BenefitLevel =
  | "insurance_plan"
  | "coverage"
  | "coverage_benefit"
  | "plan"
  | "plan_specific_cost_benefit";

export type InsurancePlanGeneralCost = {
  id: string;
  type: CodeableConcept;
  group_size: number | null;
  cost_value: string;
  cost_currency: string;
  comment: string | null;
};

export type InsurancePlanTier = {
  id: string;
  type_code: string;
  type_display: string;
  n_benefits: number;
  general_costs: InsurancePlanGeneralCost[];
};

export type InsurancePlanCoverageSection = {
  id: string;
  type_code: string;
  type_display: string;
  n_benefits: number;
};

export type InsurancePlan = {
  id: string;
  fhir_id: string;
  identifier_system: string;
  identifier_value: string;
  status: InsurancePlanStatus;
  type_code: string;
  name: string;
  period_start: string | null;
  period_end: string | null;
  owned_by_name: string;
  administered_by_name: string;
  n_plans: number;
  n_coverages: number;
  n_benefits: number;
  n_questionnaires: number;
  created_date: string;
  modified_date: string;

  additional_identifiers?: unknown[];
  alias?: string[];
  owned_by?: unknown;
  administered_by?: unknown;
  contact?: unknown[];
  n_conditions?: number;
  n_exclusions?: number;
  n_supporting_info_requirements?: number;
  latest_request?: string | null;
  latest_request_date?: string | null;
  plans?: InsurancePlanTier[];
};

export type InsurancePlanBenefitCostQualifier = {
  id: string;
  qualifier_type: BenefitCostQualifierType;
  qualifier_code: string;
  qualifier: CodeableConcept;
};

export type InsurancePlanBenefitCost = {
  id: string;
  type_code: string;
  value_amount: string;
  value_unit: string;
  qualifiers: InsurancePlanBenefitCostQualifier[];
};

export type InsurancePlanBenefitLimit = {
  id: string;
  value_amount: string;
  value_unit: string;
  code: CodeableConcept;
};

export type InsurancePlanBenefitCondition = {
  id: string;
  level: BenefitLevel;
  procedure_type: string | null;
  approval_not_required: boolean;
  scheduled_tat_approval: boolean;
  enhancement_allowed: boolean;
  quantity_allowed: number;
  is_day_care: boolean;
  implant_applicable: boolean;
  multiple_implants_allowed: boolean;
  maximum_implants_allowed: number;
  stratification_allowed: boolean;
  multiple_stratification_allowed: boolean;
  maximum_stratification_allowed: number;
  cyclic_procedure: boolean;
  maximum_cycles_allowed: number;
  govt_reserved: boolean;
  condition_type: string | null;
  code: CodeableConcept | null;
  description: string | null;
  value: string | null;
  properties: Record<string, unknown>;
};

export type InsurancePlanBenefitExclusion = {
  id: string;
  level: BenefitLevel;
  category_code: string;
  category: CodeableConcept;
  statements: string[];
  items: CodeableConcept;
  items_codes: string[];
};

export type InsurancePlanQuestionnaireRef = {
  fhir_id: string;
  title: string;
};

export type InsurancePlanSupportingInfoRequirement = {
  id: string;
  level: BenefitLevel;
  category_code: string;
  category: CodeableConcept;
  code_code: string;
  code: CodeableConcept;
  documentation_url: string | null;
  questionnaire: InsurancePlanQuestionnaireRef | null;
};

export type InsurancePlanQuestionnaire = {
  id: string;
  fhir_id: string;
  title: string;
  status: InsurancePlanStatus;
  purpose: string;
};

export type InsurancePlanQuestionnaireDetail = InsurancePlanQuestionnaire & {
  subject_type: string[];
  url: string;
  full_url: string;
  items: unknown[];
};

export type InsurancePlanBenefit = {
  id: string;
  type_code: string;
  type_display: string;
  coverage_type_code: string;
  coverage_type_display: string;
  plan_type_code: string;
  plan_type_display: string;
  plan_id: string;
  specialty_category_code: string;
  specialty_category_display: string;
  min_cost: string;
  max_cost: string;
  max_limit_amount: string;
  cost_count: number;
  qualifier_count: number;
  authorization_required: boolean;
  is_day_care: boolean;
  implant_applicable: boolean;
  stratification_allowed: boolean;
  procedure_type: string;
  has_stratification_qualifier: boolean;
  has_implant_qualifier: boolean;
  has_consumable_qualifier: boolean;
  has_questionnaire: boolean;
  requires_supporting_info: boolean;
  supporting_info_count: number;
  condition_count: number;
  exclusion_count: number;
};

export type InsurancePlanBenefitDetail = InsurancePlanBenefit & {
  coverage_id: string;
  specific_cost_benefit_id: string;
  coverage_benefit_fhir_ids: string[];
  questionnaire_fhir_ids: string[];
  costs: InsurancePlanBenefitCost[];
  limits: InsurancePlanBenefitLimit[];
  conditions: InsurancePlanBenefitCondition[];
  exclusions: InsurancePlanBenefitExclusion[];
  supporting_info_requirements: InsurancePlanSupportingInfoRequirement[];
  questionnaires: InsurancePlanQuestionnaire[];
};

export type InsurancePlanExtensions = {
  conditions: InsurancePlanBenefitCondition[];
  exclusions: InsurancePlanBenefitExclusion[];
  supporting_info_requirements: InsurancePlanSupportingInfoRequirement[];
};
