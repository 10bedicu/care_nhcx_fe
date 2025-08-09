import {
  CodeableConcept,
  Identifier,
  InsurancePlanContact,
  InsurancePlanCoverage,
  InsurancePlanCoverageBenefit,
  InsurancePlanPlan,
} from "@medplum/fhirtypes";

import { Period } from "./base";

export type ClaimExclusionExtension = {
  id?: string;
  url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-Exclusion";
  extension: (
    | {
        url: "category";
        valueCodeableConcept: CodeableConcept;
      }
    | {
        url: "statement";
        valueString: string;
      }
    | {
        url: "item";
        valueCodeableConcept: CodeableConcept;
      }
  )[];
};

export type ClaimSupportingInfoRequirementExtension = {
  id?: string;
  url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-SupportingInfoRequirement";
  extension: (
    | {
        url: "category";
        valueCodeableConcept: CodeableConcept;
      }
    | {
        url: "code";
        valueCodeableConcept: CodeableConcept;
      }
    | {
        url: "documentationUrl";
        valueUrl: string;
      }
  )[];
};

export type ClaimConditionExtension = {
  id?: string;
  url: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-Condition";
  extension: {
    url: "claim-condition";
    valueUrl: string;
  }[];
};

export type GenericExtension = {
  id?: string;
  url: string;
  valueString: string;
  extension?: undefined;
};

export type AllExtension =
  | ClaimSupportingInfoRequirementExtension
  | GenericExtension
  | ClaimConditionExtension
  | ClaimExclusionExtension
  | ClaimSupportingInfoRequirementExtension;

export type InsurancePlan = {
  id?: string;
  identifier: string;
  text?: string;
  extension?: (
    | ClaimExclusionExtension
    | ClaimSupportingInfoRequirementExtension
    | GenericExtension
  )[];
  product_identifier: Identifier[];
  status: string;
  type: CodeableConcept[];
  name: string;
  alias?: string[];
  period: Period;
  contact?: InsurancePlanContact[];
  coverage: (Omit<InsurancePlanCoverage, "extension" | "benefit"> & {
    extension?: (
      | ClaimConditionExtension
      | ClaimSupportingInfoRequirementExtension
      | GenericExtension
    )[];
    benefit: (Omit<InsurancePlanCoverageBenefit, "extension"> & {
      extension?: (
        | ClaimConditionExtension
        | ClaimSupportingInfoRequirementExtension
        | GenericExtension
      )[];
    })[];
  })[];
  plan?:
    | (Omit<InsurancePlanPlan, "extension"> & {
        extension?: (
          | ClaimConditionExtension
          | ClaimSupportingInfoRequirementExtension
          | ClaimExclusionExtension
          | GenericExtension
        )[];
      })[];
  request: string; // uuid
  latest_request?: string; // uuid
  latest_request_date?: string;
  created_date?: string;
  modified_date?: string;
};
