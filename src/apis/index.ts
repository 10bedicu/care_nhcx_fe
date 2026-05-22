import {
  CreateFileRequest,
  CreateFileResponse,
  FileUploadModel,
} from "@/types/file_upload";
import { queryString, request } from "@/apis/request";

import { AbhaNumber } from "@/types/abha_number";
import { ChargeItem } from "@/types/charge_item";
import { Claim } from "@/types/claim";
import { Coding } from "@/types/base";
import { Communication } from "@/types/communication";
import { Condition } from "@/types/condition";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { Encounter } from "@/types/encounter";
import { HealthFacility } from "@/types/health_facility";
import {
  InsurancePlan,
  InsurancePlanBenefit,
  InsurancePlanBenefitDetail,
  InsurancePlanCoverageSection,
  InsurancePlanExtensions,
  InsurancePlanQuestionnaire,
  InsurancePlanQuestionnaireDetail,
  InsurancePlanSupportingInfoRequirement,
  InsurancePlanTier,
} from "@/types/insurance_plan";
import { MemberBiometricAuth } from "@/types/member_biometric_auth";
import { PaginatedResponse } from "./types";
import { PaymentReconciliation } from "@/types/payment";
import { Policy } from "@/types/policy";
import { Provider } from "@/types/provider";
import { Task } from "@/types/task";
import { User } from "@/types/user";
import { createClaimFormSchema } from "@/components/create-claim-page/schema";
import { createCommunicationFormSchema } from "@/components/claim-encounter-tab/create-communication-schema";
import { createCoverageEligibilityRequestFormSchema } from "@/components/create-coverage-eligibility-request-page/schema";
import { z } from "zod";

export const apis = {
  diagnosis: {
    list: async (
      patientId: string,
      query?: {
        ordering?:
          | "created_date"
          | "-created_date"
          | "modified_date"
          | "-modified_date";
        category?: Condition["category"][];
        clinical_status?: Condition["clinical_status"][];
        exclude_verification_status?: Condition["verification_status"][];
        encounter?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const queryParams = {
        ordering: query?.ordering,
        category: query?.category?.join(","),
        clinical_status: query?.clinical_status?.join(","),
        exclude_verification_status:
          query?.exclude_verification_status?.join(","),
        encounter: query?.encounter,
        limit: query?.limit,
        offset: query?.offset,
      };

      return await request<PaginatedResponse<Condition>>(
        `/api/v1/patient/${patientId}/diagnosis/` + queryString(queryParams)
      );
    },
  },

  encounter: {
    get: async (facilityId: string, encounterId: string) => {
      return await request<Encounter>(
        `/api/v1/encounter/${encounterId}/?facility=${facilityId}`
      );
    },
  },

  coverageEligibilityRequest: {
    list: async (query?: {
      encounter?: string;
      ordering?:
        | "created_date"
        | "-created_date"
        | "modified_date"
        | "-modified_date";
    }) => {
      return await request<PaginatedResponse<CoverageEligibilityRequest>>(
        "/api/nhcx/coverage-eligibility-request/" + queryString(query)
      );
    },

    get: async (id: string) => {
      return await request<CoverageEligibilityRequest>(
        `/api/nhcx/coverage-eligibility-request/${id}/`
      );
    },

    latest: async (query?: { encounter?: string; purpose?: string }) => {
      return await request<CoverageEligibilityRequest>(
        `/api/nhcx/coverage-eligibility-request/latest` + queryString(query)
      );
    },

    create: async (
      body: z.infer<typeof createCoverageEligibilityRequestFormSchema>
    ) => {
      return await request<CoverageEligibilityRequest>(
        "/api/nhcx/coverage-eligibility-request/",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
    },

    check: async (id: string) => {
      return await request<CoverageEligibilityRequest>(
        `/api/nhcx/coverage-eligibility-request/${id}/check/`,
        {
          method: "POST",
        }
      );
    },
  },

  claim: {
    list: async (query?: {
      encounter?: string;
      ordering?:
        | "created_date"
        | "-created_date"
        | "modified_date"
        | "-modified_date";
    }) => {
      return await request<PaginatedResponse<Claim>>(
        "/api/nhcx/claim/" + queryString(query)
      );
    },

    latest: async (query?: { encounter?: string }) => {
      return await request<Claim>(
        "/api/nhcx/claim/latest" + queryString(query)
      );
    },

    get: async (id: string) => {
      return await request<Claim>(`/api/nhcx/claim/${id}/`);
    },

    create: async (body: z.infer<typeof createClaimFormSchema>) => {
      return await request<Claim>("/api/nhcx/claim/", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    submit: async (id: string) => {
      return await request<Claim>(`/api/nhcx/claim/${id}/submit/`, {
        method: "POST",
      });
    },

    cancel: async (params: { id: string; reason?: string }) => {
      return await request<Claim>(`/api/nhcx/claim/${params.id}/cancel/`, {
        method: "POST",
        body: JSON.stringify({ reason: params.reason ?? undefined }),
      });
    },

    reprocess: async (params: { id: string; reason?: string }) => {
      return await request<Claim>(`/api/nhcx/claim/${params.id}/reprocess/`, {
        method: "POST",
        body: JSON.stringify({ reason: params.reason ?? undefined }),
      });
    },

    tasks: async (id: string) => {
      return await request<PaginatedResponse<Task>>(
        `/api/nhcx/claim/${id}/tasks/`
      );
    },
  },

  file: {
    createUpload: async (body: CreateFileRequest) => {
      return await request<CreateFileResponse>("/api/v1/files/", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    markUploadCompleted: async (id: string) => {
      return await request<FileUploadModel>(
        `/api/v1/files/${id}/mark_upload_completed/`,
        {
          method: "POST",
        }
      );
    },

    get: async (id: string) => {
      return await request<FileUploadModel>(`/api/v1/files/${id}/`);
    },

    list: async (query?: {
      file_type: "patient" | "encounter";
      associating_id: string;
      ordering?: "created_date" | "-created_date";
      limit?: number;
      offset?: number;
    }) => {
      return await request<PaginatedResponse<FileUploadModel>>(
        `/api/v1/files/` + queryString(query)
      );
    },
  },

  gateway: {
    policies: async (body: {
      identifiertype: "MobileNo" | "AbhaNumber" | "MemberId";
      identifiervalue: string;
    }) => {
      return await request<Policy[]>(`/api/nhcx/gateway/get_policies/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    abhaBiometricAuthInit: async (body: {
      authMode?: "FINGERPRINT" | "IRIS" | "FACE_AUTH";
      abhaNumber: string;
      payerId: string;
      process?: "Preauth" | "Discharge";
    }) => {
      return await request<{
        txnId: string;
        authMode: "FINGERPRINT" | "IRIS" | "FACE_AUTH" | null;
        message: string;
        status: "success" | "error" | null;
      }>(`/api/nhcx/gateway/abha-biometric-auth-init/`, {
        method: "POST",
        body: JSON.stringify({
          authMode: body.authMode ?? "FINGERPRINT",
          process: body.process ?? "Preauth",
          ...body,
        }),
      });
    },

    abhaBiometricAuthVerify: async (body: {
      txnId: string;
      authMode?: "FINGERPRINT" | "IRIS" | "FACE_AUTH";
      authData: string;
      payerId: string;
      process?: "Preauth" | "Discharge";
      encounter: string;
    }) => {
      return await request<{ message: string }>(
        `/api/nhcx/gateway/abha-biometric-auth-verify/`,
        {
          method: "POST",
          body: JSON.stringify({
            authMode: body.authMode ?? "FINGERPRINT",
            process: body.process ?? "Preauth",
            ...body,
          }),
        }
      );
    },
  },

  rdService: {
    capture: async () => {
      const response = await fetch("https://127.0.0.1:11100/rd/capture", {
        method: "CAPTURE",
        body: `<?xml version="1.0"?> <PidOptions ver="1.0"> <Opts env="P" fCount="1" fType="2" format="0" pidVer="2.0" wadh="RZ+k4w9ySTzOibQdDHPzCFqrKScZ74b3EibKYy1WyGw=" timeout="10000" posh="UNKNOWN" /> <CustOpts><Param name="mantrakey" value="B0CZLLZ98Z" /></CustOpts> </PidOptions>`,
      });

      return response.text();
    },
  },

  memberBiometricAuth: {
    lookup: async (params: { payer_id: string; encounter_id: string }) => {
      return await request<MemberBiometricAuth>(
        `/api/nhcx/member-biometric-auth/lookup/` +
          queryString({
            payer_id: params.payer_id,
            encounter_id: params.encounter_id,
          })
      );
    },
  },

  abhaNumber: {
    get: async (patientId: string) => {
      return await request<AbhaNumber>(`/api/abdm/abha_number/${patientId}/`);
    },
  },

  healthFacility: {
    get: async (facilityId: string) => {
      return await request<HealthFacility>(
        `/api/abdm/health_facility/${facilityId}/`
      );
    },
  },

  valueset: {
    expand: async (
      system: string,
      body?: {
        search?: string;
        count?: number;
      }
    ) => {
      return await request<{ results: Coding[] }>(
        `/api/v1/valueset/${system}/expand/`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
    },
  },

  user: {
    facilityUsers: async (
      facilityId: string,
      query?: {
        limit?: string;
        offset?: string;
        search_text?: string;
      }
    ) => {
      return await request<PaginatedResponse<User>>(
        `/api/v1/facility/${facilityId}/users/` + queryString(query),
        {
          method: "GET",
        }
      );
    },
  },

  communication: {
    create: async (body: z.infer<typeof createCommunicationFormSchema>) => {
      return await request<Communication>(`/api/nhcx/communication/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    send: async (id: string) => {
      return await request<Communication>(
        `/api/nhcx/communication/${id}/send/`,
        {
          method: "POST",
        }
      );
    },
  },

  payment: {
    acknowledge: async (id: string) => {
      return await request<PaymentReconciliation>(
        `/api/nhcx/payment/${id}/acknowledge/`,
        { method: "POST" }
      );
    },
  },

  insurancePlan: {
    list: async (query?: {
      name?: string;
      status?: string;
      identifier_value?: string;
      ordering?: string;
    }) => {
      return await request<PaginatedResponse<InsurancePlan>>(
        `/api/nhcx/insurance-plan/` + queryString(query)
      );
    },

    get: async (id: string) => {
      return await request<InsurancePlan>(`/api/nhcx/insurance-plan/${id}/`);
    },

    plans: async (id: string) => {
      return await request<InsurancePlanTier[]>(
        `/api/nhcx/insurance-plan/${id}/plans/`
      );
    },

    coverages: async (id: string) => {
      return await request<InsurancePlanCoverageSection[]>(
        `/api/nhcx/insurance-plan/${id}/coverages/`
      );
    },

    extensions: async (id: string) => {
      return await request<InsurancePlanExtensions>(
        `/api/nhcx/insurance-plan/${id}/extensions/`
      );
    },

    request: async (body: { facility: string; policy: Policy }) => {
      return await request<{ task_id: string }>(
        `/api/nhcx/insurance-plan/request/`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
    },

    questionnaires: async (id: string) => {
      return await request<InsurancePlanQuestionnaireDetail[]>(
        `/api/nhcx/insurance-plan/${id}/questionnaires/`
      );
    },
  },

  insurancePlanBenefit: {
    list: async (query?: {
      insurance_plan?: string;
      plan_tier?: string;
      coverage?: string;
      q?: string;
      type_code?: string;
      coverage_type_code?: string;
      plan_type_code?: string;
      specialty_category_code?: string;
      procedure_type?: string;
      authorization_required?: boolean;
      is_day_care?: boolean;
      implant_applicable?: boolean;
      stratification_allowed?: boolean;
      has_copayment?: boolean;
      has_deductible?: boolean;
      has_waiting_period?: boolean;
      has_stratification_qualifier?: boolean;
      has_implant_qualifier?: boolean;
      has_consumable_qualifier?: boolean;
      has_questionnaire?: boolean;
      requires_supporting_info?: boolean;
      min_cost_gte?: number;
      max_cost_lte?: number;
      ordering?: string;
      limit?: number;
      offset?: number;
    }) => {
      return await request<PaginatedResponse<InsurancePlanBenefit>>(
        `/api/nhcx/insurance-plan-benefit/` + queryString(query)
      );
    },

    get: async (id: string) => {
      return await request<InsurancePlanBenefitDetail>(
        `/api/nhcx/insurance-plan-benefit/${id}/`
      );
    },

    lookup: async (body: {
      insurance_plan: string;
      type_code: string;
      plan_tier?: string;
      coverage_type_code?: string;
    }) => {
      return await request<InsurancePlanBenefitDetail>(
        `/api/nhcx/insurance-plan-benefit/lookup/`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
    },

    requirements: async (id: string) => {
      return await request<InsurancePlanSupportingInfoRequirement[]>(
        `/api/nhcx/insurance-plan-benefit/${id}/requirements/`
      );
    },

    questionnaires: async (id: string) => {
      return await request<InsurancePlanQuestionnaire[]>(
        `/api/nhcx/insurance-plan-benefit/${id}/questionnaires/`
      );
    },

    extensions: async (id: string) => {
      return await request<InsurancePlanExtensions>(
        `/api/nhcx/insurance-plan-benefit/${id}/extensions/`
      );
    },
  },

  insurancePlanQuestionnaire: {
    get: async (id: string) => {
      return await request<InsurancePlanQuestionnaireDetail>(
        `/api/nhcx/insurance-plan-questionnaire/${id}/`
      );
    },
  },

  provider: {
    get: async (facilityId: string) => {
      return await request<Provider>(`/api/nhcx/provider/${facilityId}/`);
    },

    create: async (body: { facility: string }) => {
      return await request<Provider>(`/api/nhcx/provider/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    update: async (facilityId: string, body: { regenerate_keys: boolean }) => {
      return await request<Provider>(`/api/nhcx/provider/${facilityId}/`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
  },

  charge_item: {
    list: async (
      facilityId: string,
      query?: {
        title?: string;
        encounter?: string;
        account?: string;
        patient?: string;
        performer_actor?: string;
        created_by?: string;
        ordering?: "created_date" | "-created_date";
        limit?: number;
        offset?: number;
      }
    ) => {
      return await request<PaginatedResponse<ChargeItem>>(
        `/api/v1/facility/${facilityId}/charge_item/` + queryString(query)
      );
    },
  },
};
