import {
  CreateFileRequest,
  CreateFileResponse,
  FileUploadModel,
} from "@/types/file_upload";
import { queryString, request } from "./request";

import { AbhaNumber } from "@/types/abha_number";
import { Claim } from "@/types/claim";
import { Coding } from "@/types/base";
import { Communication } from "@/types/communication";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { PaginatedResponse } from "./types";
import { Policy } from "@/types/policy";
import { Task } from "@/types/task";
import { User } from "@/types/user";
import { createClaimFormSchema } from "@/components/create-claim-page/schema";
import { createCommunicationFormSchema } from "@/components/claim-encounter-tab/create-communication-schema";
import { createCoverageEligibilityRequestFormSchema } from "@/components/create-coverage-eligibility-request-page/schema";
import { z } from "zod";

export const apis = {
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
  },

  abhaNumber: {
    get: async (patientId: string) => {
      return await request<AbhaNumber>(`/api/abdm/abha_number/${patientId}/`);
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
};
