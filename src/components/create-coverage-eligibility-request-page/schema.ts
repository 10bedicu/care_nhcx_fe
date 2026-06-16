import {
  COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES,
  COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES,
  COVERAGE_ELIGIBILITY_REQUEST_STATUS_CHOICES,
} from "@/types/coverage_eligibility";

import { z } from "zod";

export const codingSchema = z.object({
  system: z.string(),
  code: z.string(),
  display: z.string().optional(),
});

export const periodSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export const quantitySchema = z.object({
  value: z.coerce.number().gt(0),
  unit: codingSchema.optional(),
  code: codingSchema.optional(),
});

export const coverageEligibilityRequestSupportingInfoSchema = z
  .object({
    sequence: z.number().int().positive(),
    value_string: z.string().optional(),
    value_attachment: z.string().uuid().optional(),
    value_file: z.instanceof(File).optional(),
  })
  .refine(
    (data) => {
      return (
        (data.value_string && !data.value_attachment && !data.value_file) ||
        (!data.value_string && data.value_attachment && !data.value_file) ||
        (!data.value_string && !data.value_attachment && data.value_file)
      );
    },
    {
      message:
        "Either value_string or value_attachment must be provided, but not both",
      path: ["value_string", "value_attachment"],
    }
  );

export const policySchema = z.object({
  sno: z.string(),
  abhanumber: z.string(),
  mobilenumber: z.string(),
  memberid: z.string(),
  payerid: z.string(),
  productid: z.string(),
  productname: z.string(),
  processingid: z.string(),
  policy_period: z
    .object({ start: z.string(), end: z.string() })
    .nullable()
    .optional(),
});

export const coverageEligibilityRequestInsuranceSchema = z.object({
  sequence: z.number().int().positive(),
  focal: z.boolean().default(false),
  policy: policySchema,
});

export const coverageEligibilityRequestDiagnosisSchema = z
  .object({
    diagnosis_reference: z.string().uuid().optional(),
    diagnosis_code: codingSchema.optional(),
  })
  .refine(
    (data) => {
      return (
        (data.diagnosis_reference && !data.diagnosis_code) ||
        (!data.diagnosis_reference && data.diagnosis_code)
      );
    },
    {
      message:
        "Either diagnosis_reference or diagnosis_code must be provided, but not both",
      path: ["diagnosis_reference", "diagnosis_code"],
    }
  );

export const coverageEligibilityRequestItemSchema = z
  .object({
    sequence: z.number().int().positive(),
    supporting_info_sequence: z.array(z.number().int().positive()).default([]),
    category: codingSchema,
    product_or_service: codingSchema.optional(),
    modifier: z.array(codingSchema).default([]),
    quantity: quantitySchema,
    diagnosis: z.array(coverageEligibilityRequestDiagnosisSchema).default([]),
    _condition_errors: z.string().optional(),
    _mandatory_diagnosis_error: z.string().optional(),
    _mandatory_supporting_info_error: z.string().optional(),
    /**
     * Internal marker set on auto-generated implant line items. Holds the
     * sequence of the parent item whose implant modifier generated this item.
     * Stripped/ignored by the backend.
     */
    _implant_parent_sequence: z.number().int().positive().optional(),
    /** Internal: the implant modifier code that generated this line item. */
    _implant_code: z.string().optional(),
  })
  .refine(
    (data) => !data._mandatory_diagnosis_error,
    (data) => ({
      message:
        data._mandatory_diagnosis_error ??
        "All diagnosis entries must be completed",
      path: ["_mandatory_diagnosis_error"],
    }),
  )
  .refine(
    (data) => !data._mandatory_supporting_info_error,
    (data) => ({
      message:
        data._mandatory_supporting_info_error ??
        "All supporting information entries must be completed",
      path: ["_mandatory_supporting_info_error"],
    }),
  )
  .refine(
    (data) => !data._condition_errors,
    (data) => ({
      message: data._condition_errors ?? "Condition validation failed",
      path: ["_condition_errors"],
    }),
  );

export const createCoverageEligibilityRequestFormSchema = z.object({
  status: z.enum(COVERAGE_ELIGIBILITY_REQUEST_STATUS_CHOICES),
  priority: z.enum(COVERAGE_ELIGIBILITY_REQUEST_PRIORITY_CHOICES),
  purpose: z
    .array(z.enum(COVERAGE_ELIGIBILITY_REQUEST_PURPOSE_CHOICES))
    .min(1)
    .default([]),
  facility: z.string().uuid(),
  patient: z.string().uuid(),
  encounter: z.string().uuid().optional(),
  supporting_info: z
    .array(coverageEligibilityRequestSupportingInfoSchema)
    .default([]),
  insurance: z
    .array(coverageEligibilityRequestInsuranceSchema)
    .min(1)
    .default([])
    .refine(
      (data) => {
        return data.some((item) => item.focal);
      },
      {
        message: "At least one focal insurance is required",
      }
    ),
  item: z.array(coverageEligibilityRequestItemSchema).min(0).default([]),
});
