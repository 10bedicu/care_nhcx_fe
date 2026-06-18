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

export const claimSupportingInfoResourceSchema = z.object({
  resource_type: z.string(),
  resource_id: z.string().uuid(),
});

export const claimSupportingInfoSchema = z
  .object({
    sequence: z.number().int().positive(),
    category: codingSchema,
    code: codingSchema,
    timing: periodSchema.optional(),
    value_string: z.string().optional(),
    value_attachment: z.string().uuid().optional(),
    value_file: z.instanceof(File).optional(),
    /** Reference to an existing care/EMR record (e.g. diagnostic report,
     * questionnaire response). Converted into an ABDM FHIR document and
     * embedded as a DocumentReference on the backend. */
    value_resource: claimSupportingInfoResourceSchema.optional(),
    /** Internal marker: true = belongs to plan level, false/undefined = item level. Stripped before API submission. */
    _is_plan_level: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const provided = [
        data.value_string,
        data.value_attachment,
        data.value_file,
        data.value_resource,
      ].filter((value) => value !== undefined && value !== null && value !== "");
      return provided.length === 1;
    },
    {
      message:
        "Please provide a value — enter text, upload an attachment, or select a record",
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
  policy_period: z
    .object({ start: z.string(), end: z.string() })
    .nullable()
    .optional(),
});

export const claimInsuranceSchema = z.object({
  sequence: z.number().int().positive(),
  focal: z.boolean().default(false),
  policy: policySchema,
});

export const claimItemSchema = z
  .object({
    sequence: z.number().int().positive(),
    care_team_sequence: z
      .array(z.number().int().positive())
      .min(1, "At least one care team member is required")
      .default([]),
    diagnosis_sequence: z
      .array(z.number().int().positive())
      .min(1, "At least one diagnosis is required")
      .default([]),
    procedure_sequence: z.array(z.number().int().positive()).default([]),
    information_sequence: z.array(z.number().int().positive()).default([]),
    category: codingSchema.optional(),
    product_or_service: codingSchema.optional(),
    charge_items: z.array(z.string().uuid()).default([]),
    modifier: z.array(codingSchema).default([]),
    program_code: z.array(codingSchema).default([]),
    serviced_period: z
      .object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      })
      .optional(),
    quantity: quantitySchema,
    unit_price: z.number().gte(0),
    factor: z.number().optional(),
    _mandatory_docs_error: z.string().optional(),
    _mandatory_questionnaires_error: z.string().optional(),
    _mandatory_care_team_error: z.string().optional(),
    _mandatory_diagnosis_error: z.string().optional(),
    _mandatory_charge_items_error: z.string().optional(),
    _mandatory_procedure_error: z.string().optional(),
    _mandatory_supporting_info_error: z.string().optional(),
    _amount_cap_error: z.string().optional(),
    _condition_errors: z.string().optional(),
    /**
     * Internal marker set on auto-generated implant line items. Holds the
     * sequence of the parent item whose implant selection generated this item.
     * Stripped before API submission.
     */
    _implant_parent_sequence: z.number().int().positive().optional(),
    /** Internal: the implant code that generated this line item. */
    _implant_code: z.string().optional(),
  })
  .refine(
    (data) => !!data.serviced_period?.start,
    {
      message: "Service start date is required",
      path: ["serviced_period", "start"],
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
  )
  .refine(
    (data) => !data._mandatory_care_team_error,
    (data) => ({
      message:
        data._mandatory_care_team_error ??
        "At least one care team member is required",
      path: ["_mandatory_care_team_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_diagnosis_error,
    (data) => ({
      message:
        data._mandatory_diagnosis_error ??
        "At least one diagnosis is required",
      path: ["_mandatory_diagnosis_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_charge_items_error,
    (data) => ({
      message:
        data._mandatory_charge_items_error ??
        "At least one charge item is required",
      path: ["_mandatory_charge_items_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_procedure_error,
    (data) => ({
      message:
        data._mandatory_procedure_error ??
        "All procedure entries must be completed",
      path: ["_mandatory_procedure_error"],
    })
  )
  .refine(
    (data) => !data._mandatory_supporting_info_error,
    (data) => ({
      message:
        data._mandatory_supporting_info_error ??
        "All supporting information entries must be completed",
      path: ["_mandatory_supporting_info_error"],
    })
  )
  .refine(
    (data) => !data._condition_errors,
    (data) => ({
      message: data._condition_errors ?? "Condition validation failed",
      path: ["_condition_errors"],
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
    diagnosis: z.array(claimDiagnosisSchema).default([]),
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
    _total_amount_cap_error: z.string().optional(),
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
  )
  .refine(
    (data) => !data._total_amount_cap_error,
    (data) => ({
      message:
        data._total_amount_cap_error ??
        "The amount requested exceeds the available wallet balance. Please inform the patient.",
      path: ["_total_amount_cap_error"],
    })
  )
  .superRefine((data, ctx) => {
    if (data.use !== "claim") return;
    data.item.forEach((item, index) => {
      if (!item.serviced_period?.end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Service end date is required",
          path: ["item", index, "serviced_period", "end"],
        });
      }
    });
  });
