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
  value: z.number().gt(0),
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
    supporting_info_sequence: z.array(z.number().int().positive()).default([]),
    category: codingSchema,
    product_or_service: codingSchema.optional(),
    charge_item: z.string().uuid().optional(),
    quantity: quantitySchema,
    unit_price: z.number().gt(0),
    diagnosis: z.array(coverageEligibilityRequestDiagnosisSchema).default([]),
  })
  .refine(
    (data) => {
      return (
        (data.product_or_service && !data.charge_item) ||
        (!data.product_or_service && data.charge_item)
      );
    },
    {
      message:
        "Either product_or_service or charge_item must be provided, but not both",
      path: ["product_or_service", "charge_item"],
    }
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
  item: z.array(coverageEligibilityRequestItemSchema).min(1).default([]),
});
