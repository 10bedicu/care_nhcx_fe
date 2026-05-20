import {
  CLAIM_DIAGNOSIS_ON_ADMISSION_CHOICES,
  CLAIM_PRIORITY_CHOICES,
  CLAIM_STATUS_CHOICES,
  CLAIM_USE_CHOICES,
} from "@/types/claim";

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

export const claimRelatedSchema = z.object({
  claim: z.string().uuid(),
  relationship: codingSchema.optional(),
  reference: z.string().optional(),
});

export const claimCareTeamSchema = z.object({
  sequence: z.number().int().positive(),
  provider: z.string().uuid(),
  responsible: z.boolean().optional(),
  role: codingSchema.optional(),
});

export const claimDiagnosisSchema = z
  .object({
    sequence: z.number().int().positive(),
    type: z.array(codingSchema).min(1).default([]),
    diagnosis_reference: z.string().uuid().optional(),
    diagnosis_code: codingSchema.optional(),
    on_admission: z.enum(CLAIM_DIAGNOSIS_ON_ADMISSION_CHOICES).optional(),
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
        "Either a diagnosis reference or a diagnosis code must be provided, but not both",
      path: ["diagnosis_code"],
    }
  );

export const claimProcedureSchema = z
  .object({
    sequence: z.number().int().positive(),
    type: z.array(codingSchema).default([]),
    date: z.string().datetime().optional(),
    procedure_reference: z.string().uuid().optional(),
    procedure_code: codingSchema.optional(),
  })
  .refine(
    (data) => {
      return (
        (data.procedure_reference && !data.procedure_code) ||
        (!data.procedure_reference && data.procedure_code)
      );
    },
    {
      message:
        "Either a procedure reference or a procedure code must be provided, but not both",
      path: ["procedure_code"],
    }
  );

export const claimSupportingInfoSchema = z
  .object({
    sequence: z.number().int().positive(),
    category: codingSchema,
    code: codingSchema,
    timing: periodSchema.optional(),
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
        "Please provide a value — either enter text or upload an attachment",
      path: ["value_string"],
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

export const claimInsuranceSchema = z.object({
  sequence: z.number().int().positive(),
  focal: z.boolean().default(false),
  policy: policySchema,
});

export const claimItemSchema = z
  .object({
    sequence: z.number().int().positive(),
    care_team_sequence: z.array(z.number().int().positive()).default([]),
    diagnosis_sequence: z.array(z.number().int().positive()).default([]),
    procedure_sequence: z.array(z.number().int().positive()).default([]),
    information_sequence: z.array(z.number().int().positive()).default([]),
    category: codingSchema.optional(),
    product_or_service: codingSchema.optional(),
    charge_item: z.string().uuid().optional(),
    modifier: z.array(codingSchema).default([]),
    program_code: z.array(codingSchema).default([]),
    serviced_period: periodSchema.optional(),
    quantity: quantitySchema,
    unit_price: z.number().gt(0),
    factor: z.number().optional(),
    _mandatory_docs_error: z.string().optional(),
    _mandatory_questionnaires_error: z.string().optional(),
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
        "Either a product/service or a charge item must be provided, but not both",
      path: ["product_or_service"],
    }
  )
  .refine(
    (data) => !data._mandatory_docs_error,
    (data) => ({
      message:
        data._mandatory_docs_error ??
        "All mandatory documents must be provided",
      path: ["_mandatory_docs_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_questionnaires_error,
    (data) => ({
      message:
        data._mandatory_questionnaires_error ??
        "All mandatory questionnaires must be completed",
      path: ["_mandatory_questionnaires_error"],
    })
  );

export const claimAccidentSchema = z.object({
  date: z.string().datetime(),
  type: codingSchema.optional(),
  location: z.string().optional(),
});

export const questionnaireAnswerSchema = z.object({
  value_boolean: z.boolean().optional(),
  value_decimal: z.number().optional(),
  value_integer: z.number().int().optional(),
  value_date: z.string().optional(),
  value_date_time: z.string().optional(),
  value_time: z.string().optional(),
  value_string: z.string().optional(),
  value_uri: z.string().optional(),
  value_coding: codingSchema.optional(),
  value_quantity: z
    .object({ value: z.number(), unit: z.string().optional() })
    .optional(),
  value_attachment: z.string().uuid().optional(),
});

export type QuestionnaireResponseItemInput = {
  link_id: string;
  text?: string;
  answer?: z.infer<typeof questionnaireAnswerSchema>[];
  item?: QuestionnaireResponseItemInput[];
};

export const questionnaireResponseItemSchema: z.ZodType<QuestionnaireResponseItemInput> =
  z.lazy(() =>
    z.object({
      link_id: z.string(),
      text: z.string().optional(),
      answer: z.array(questionnaireAnswerSchema).optional(),
      item: z.array(questionnaireResponseItemSchema).optional(),
    })
  );

export const claimQuestionnaireResponseSchema = z
  .object({
    sequence: z.number().int().nonnegative().default(0),
    questionnaire: z.string(),
    category: codingSchema,
    code: codingSchema,
    item: z.array(questionnaireResponseItemSchema).default([]),
    _required_items_error: z.string().optional(),
  })
  .refine(
    (data) => !data._required_items_error,
    (data) => ({
      message:
        data._required_items_error ??
        "All required questions must be answered",
      path: ["_required_items_error"],
    })
  );

export const claimPaymentSchema = z.object({});

export const createClaimFormSchema = z
  .object({
    use: z.enum(CLAIM_USE_CHOICES),
    status: z.enum(CLAIM_STATUS_CHOICES),
    priority: z.enum(CLAIM_PRIORITY_CHOICES),
    type: codingSchema,
    facility: z.string().uuid(),
    patient: z.string().uuid(),
    encounter: z.string().uuid().optional(),
    billable_period: periodSchema.optional(),
    related: z.array(claimRelatedSchema).default([]),
    care_team: z.array(claimCareTeamSchema).default([]),
    supporting_info: z.array(claimSupportingInfoSchema).default([]),
    procedure: z.array(claimProcedureSchema).default([]),
    diagnosis: z.array(claimDiagnosisSchema).min(1).default([]),
    insurance: z
      .array(claimInsuranceSchema)
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
    item: z.array(claimItemSchema).min(1).default([]),
    accident: claimAccidentSchema.optional(),
    payment: claimPaymentSchema.optional(),
    questionnaire_responses: z
      .array(claimQuestionnaireResponseSchema)
      .default([]),
    _mandatory_plan_docs_error: z.string().optional(),
    _mandatory_plan_questionnaires_error: z.string().optional(),
  })
  .refine(
    (data) => !data._mandatory_plan_docs_error,
    (data) => ({
      message:
        data._mandatory_plan_docs_error ??
        "All mandatory plan-level documents must be provided",
      path: ["_mandatory_plan_docs_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_plan_questionnaires_error,
    (data) => ({
      message:
        data._mandatory_plan_questionnaires_error ??
        "All mandatory plan-level questionnaires must be completed",
      path: ["_mandatory_plan_questionnaires_error"],
    })
  );
