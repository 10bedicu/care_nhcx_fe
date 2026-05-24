import {
  CLAIM_USE_CHOICES,
  ClaimDiagnosisOnAdmissionChoice,
  ClaimUseChoice,
} from "@/types/claim";
import { Condition, ConditionCategory } from "@/types/condition";
import {
  DEFAULT_DIAGNOSIS_TYPE,
  DEFAULT_ITEM_CATEGORY,
  DEFAULT_PROGRAM_CODE,
  DEFAULT_RELATED_RELATIONSHIP,
  DEFAULT_SUPPORTING_INFO_CATEGORY,
  DEFAULT_SUPPORTING_INFO_CODE,
  chargeItemHasCoding,
  parsePositiveNumber,
} from "@/lib/prefill";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
  PlanLevelQuestionnairesSection,
  PlanLevelSupportingInfoSection,
} from "./claim-plan-level-section";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useQueryParams } from "raviger";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChargeItem } from "@/types/charge_item";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { EncounterClass } from "@/types/encounter";
import { FileUploadModel } from "@/types/file_upload";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import PayerQueryBanner from "@/components/common/payer-query-banner";
import { PmjayBiometricVerificationGate } from "@/components/common/pmjay-biometric-verification-gate";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function parseUseQueryParam(value: unknown): ClaimUseChoice | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  const match = CLAIM_USE_CHOICES.find((choice) => choice === lower);
  return match ?? null;
}

function parseStringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export type CreateClaimPageProps = {
  facilityId: string;
  patientId: string;
  encounterId: string;
};

const CreateClaimPage: FC<CreateClaimPageProps> = ({
  facilityId,
  patientId,
  encounterId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [queryParams] = useQueryParams();

  const lockedUse = useMemo(
    () => parseUseQueryParam(queryParams?.use),
    [queryParams?.use]
  );

  const coverageEligibilityId = useMemo(
    () => parseStringParam(queryParams?.coverage_eligibility),
    [queryParams?.coverage_eligibility]
  );

  const relatedClaimId = useMemo(
    () => parseStringParam(queryParams?.related),
    [queryParams?.related]
  );

  // The guided flow drives the form via two mutually-exclusive prefill sources:
  //   `related`              → seed from a previous claim (PA→PA, PA→Claim,
  //                            Claim→Claim) and treat its `latest_response` as
  //                            the payer query to surface.
  //   `coverage_eligibility` → seed from a CE:AR request when there is no
  //                            previous claim attached (PA via CE:AR).
  const flowKind: "via-related" | "via-ce-ar" | "fresh" = relatedClaimId
    ? "via-related"
    : coverageEligibilityId
    ? "via-ce-ar"
    : "fresh";

  const form = useForm<z.infer<typeof createClaimFormSchema>>({
    resolver: zodResolver(createClaimFormSchema),
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "draft",
      priority: "normal",
      use: lockedUse ?? undefined,
    },
  });

  useEffect(() => {
    if (relatedClaimId) {
      const existingRelated = form.getValues("related") || [];
      if (!existingRelated.find((r) => r.claim === relatedClaimId)) {
        form.setValue("related", [
          {
            claim: relatedClaimId,
            relationship: DEFAULT_RELATED_RELATIONSHIP,
            reference: "",
          },
          ...existingRelated,
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previousClaimId = useWatch({
    control: form.control,
    name: "related.0.claim",
  });

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const { data: previousClaim } = useQuery({
    queryKey: ["claim", previousClaimId],
    queryFn: () => apis.claim.get(previousClaimId),
    enabled: !!previousClaimId,
  });

  const { data: coverageEligibilityRequest } = useQuery({
    queryKey: ["coverage-eligibility-request", coverageEligibilityId],
    queryFn: () =>
      apis.coverageEligibilityRequest.get(coverageEligibilityId as string),
    enabled: !!coverageEligibilityId,
  });

  // CE:validation latest — used to enforce total wallet balance cap
  const { data: ceValidation } = useQuery({
    queryKey: [
      "coverage-eligibility-request",
      "latest",
      "validation",
      encounterId,
    ],
    queryFn: () =>
      apis.coverageEligibilityRequest.latest({
        encounter: encounterId,
        purpose: "validation",
      }),
    enabled: !!encounterId,
    staleTime: 5 * 60 * 1000,
  });

  const didPrefillEncounterRef = useRef(false);
  const didPrefillCeRef = useRef(false);
  // Bumped whenever the form is bulk-prefilled (CE:AR or previous-claim).
  // Used as a `key` on dynamic-array sections so their `useFieldArray` hooks
  // are forced to re-read from the fresh form state — works around the known
  // case where `form.reset`/`setValue` do not always propagate to nested
  // field arrays in react-hook-form v7.
  const [prefillNonce, setPrefillNonce] = useState(0);

  const { data: encounterDiagnoses, isFetched: encounterDiagnosesFetched } =
    useQuery({
      queryKey: ["encounter-diagnoses", patientId, encounterId],
      queryFn: async (): Promise<Condition[]> => {
        const res = await apis.diagnosis.list(patientId, {
          encounter: encounterId,
          category: [ConditionCategory.encounter_diagnosis],
          ordering: "-created_date",
        });
        return res.results || [];
      },
      enabled: !!patientId && !!encounterId && flowKind === "fresh",
      staleTime: 60 * 1000,
    });

  const { data: encounterFiles, isFetched: encounterFilesFetched } = useQuery({
    queryKey: ["encounter-files", encounterId],
    queryFn: async (): Promise<FileUploadModel[]> => {
      const res = await apis.file.list({
        file_type: "encounter",
        associating_id: encounterId,
        ordering: "-created_date",
      });
      return (res.results || []).filter((file) => !!file.id);
    },
    enabled: !!encounterId && flowKind === "fresh",
    staleTime: 60 * 1000,
  });

  const { data: encounterChargeItems, isFetched: encounterChargeItemsFetched } =
    useQuery({
      queryKey: ["encounter-charge-items", facilityId, encounterId],
      queryFn: async (): Promise<ChargeItem[]> => {
        const res = await apis.charge_item.list(facilityId, {
          encounter: encounterId,
          ordering: "-created_date",
        });
        return res.results || [];
      },
      enabled: !!facilityId && !!encounterId,
      staleTime: 60 * 1000,
    });

  const { data: encounter, isFetched: encounterFetched } = useQuery({
    queryKey: ["encounter", facilityId, encounterId],
    queryFn: () => apis.encounter.get(facilityId, encounterId),
    enabled: !!facilityId && !!encounterId,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!encounter) {
      return;
    }

    switch (encounter.encounter_class) {
      case EncounterClass.inpatient:
        form.setValue("type", {
          code: "737481003",
          system: "http://snomed.info/sct",
          display: "Inpatient care management",
        });
        break;
      case EncounterClass.outpatient:
        form.setValue("type", {
          code: "737492002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
      case EncounterClass.observation:
        form.setValue("type", {
          code: "737492002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
      case EncounterClass.emergency:
        form.setValue("type", {
          code: "737481003",
          system: "http://snomed.info/sct",
          display: "Inpatient care management",
        });
        break;
      case EncounterClass.virtual:
        form.setValue("type", {
          code: "713603004",
          system: "http://snomed.info/sct",
          display: "Advance care planning",
        });
        break;
      case EncounterClass.home:
        form.setValue("type", {
          code: "60689008",
          system: "http://snomed.info/sct",
          display: "Home care of patient",
        });
        break;
      default:
        form.setValue("type", {
          code: "737850002",
          system: "http://snomed.info/sct",
          display: "Outpatient care management",
        });
        break;
    }
  }, [encounter, form]);

  // ─── Fresh encounter-based prefill ─────────────────────────────────────────
  //
  // Only used when the form is not seeded from either a previous claim or a
  // coverage-eligibility request. New items are now expected to flow through
  // CE:AR; this branch is preserved as a defensive fallback so the form is not
  // empty if the user navigates here directly.
  useEffect(() => {
    if (flowKind !== "fresh") return;
    if (didPrefillEncounterRef.current) return;
    if (
      !encounterDiagnosesFetched ||
      !encounterFilesFetched ||
      !encounterChargeItemsFetched ||
      !encounterFetched
    ) {
      return;
    }

    const existingDiagnosis = form.getValues("diagnosis") || [];
    const existingSupportingInfo = form.getValues("supporting_info") || [];
    const existingCareTeam = form.getValues("care_team") || [];
    const existingItems = form.getValues("item") || [];
    if (
      existingDiagnosis.length > 0 ||
      existingSupportingInfo.length > 0 ||
      existingCareTeam.length > 0 ||
      existingItems.length > 0
    ) {
      didPrefillEncounterRef.current = true;
      return;
    }

    didPrefillEncounterRef.current = true;

    const diagnosis = (encounterDiagnoses || []).map((c, idx) => ({
      sequence: idx + 1,
      type: [DEFAULT_DIAGNOSIS_TYPE],
      diagnosis_reference: undefined,
      diagnosis_code: c.code,
      on_admission: "unknown" as ClaimDiagnosisOnAdmissionChoice,
    }));
    const diagnosisSequences = diagnosis.map((d) => d.sequence);
    form.setValue("diagnosis", diagnosis);

    const supportingInfo = (encounterFiles || []).map((file, idx) => ({
      sequence: idx + 1,
      category: DEFAULT_SUPPORTING_INFO_CATEGORY,
      code: DEFAULT_SUPPORTING_INFO_CODE,
      timing: undefined,
      value_string: undefined,
      value_attachment: file.id,
      _is_plan_level: false,
    }));
    const informationSequences = supportingInfo.map((info) => info.sequence);
    form.setValue("supporting_info", supportingInfo);

    const care_team =
      encounter?.care_team
        ?.filter((entry) => entry.member?.id)
        .map((entry, idx) => ({
          sequence: idx + 1,
          provider: entry.member.id,
          responsible: false,
          role: entry.role,
        })) || [];
    const careTeamSequences = care_team.map((m) => m.sequence);
    form.setValue("care_team", care_team);

    const codedChargeItems = (encounterChargeItems || []).filter(
      chargeItemHasCoding
    );

    const emptyItemTemplate = {
      care_team_sequence: [...careTeamSequences],
      procedure_sequence: [] as number[],
      category: DEFAULT_ITEM_CATEGORY,
      program_code: [DEFAULT_PROGRAM_CODE] as z.infer<
        typeof createClaimFormSchema
      >["item"][number]["program_code"],
      serviced_period: undefined,
      factor: undefined,
    };

    if (codedChargeItems.length > 0) {
      form.setValue(
        "item",
        codedChargeItems.map((ci, idx) => ({
          ...emptyItemTemplate,
          sequence: idx + 1,
          product_or_service: {
            system: ci.code.system,
            code: ci.code.code,
            display: ci.code.display,
          },
          charge_items: [ci.id],
          modifier: [],
          diagnosis_sequence: [...diagnosisSequences],
          information_sequence: [...informationSequences],
          quantity: {
            value: parsePositiveNumber(ci.quantity, 1),
          },
          unit_price: 0,
        }))
      );
    }
    setPrefillNonce((n) => n + 1);
  }, [
    flowKind,
    encounter,
    encounterChargeItems,
    encounterChargeItemsFetched,
    encounterDiagnoses,
    encounterDiagnosesFetched,
    encounterFetched,
    encounterFiles,
    encounterFilesFetched,
    form,
  ]);

  // ─── Previous-claim prefill (PA via PA, Claim via PA, Claim via Claim) ────
  useEffect(() => {
    if (!previousClaim) return;
    if (flowKind !== "via-related") return;

    const current = form.getValues();

    const mappedValues: z.infer<typeof createClaimFormSchema> = {
      facility: current.facility,
      patient: current.patient,
      encounter: current.encounter,
      // The guided flow may force a specific use via query param; respect it so
      // we don't accidentally copy the previous claim's use (e.g. when
      // following up on a preauthorization to file an actual claim).
      use: lockedUse ?? previousClaim.use,
      status: "draft",
      priority: previousClaim.priority,
      type: previousClaim.type,
      billable_period: previousClaim.billable_period,
      related: (current.related || []).map((r) =>
        r.claim === relatedClaimId
          ? {
              ...r,
              relationship: r.relationship ?? DEFAULT_RELATED_RELATIONSHIP,
              reference:
                r.reference ||
                previousClaim.latest_response?.pre_auth_ref ||
                "",
            }
          : r
      ),
      care_team:
        (previousClaim.care_team || []).map((m) => ({
          sequence: m.sequence,
          provider: m.provider?.id,
          responsible: m.responsible ?? false,
          role: m.role,
        })) || [],

      // Derive _is_plan_level: sequences that appear in no item's
      // information_sequence are plan-level.
      supporting_info: (() => {
        const itemInfoSeqs = new Set(
          (previousClaim.item || []).flatMap(
            (it) => it.information_sequence || []
          )
        );
        return (previousClaim.supporting_info || []).map((s) => ({
          sequence: s.sequence,
          category: s.category,
          code: s.code,
          timing: s.timing,
          value_string: s.value_string,
          value_attachment: s.value_attachment as unknown as string,
          _is_plan_level: !itemInfoSeqs.has(s.sequence),
        }));
      })(),

      procedure: (previousClaim.procedure || []).map((p) => ({
        sequence: p.sequence,
        type: p.type || [],
        date: p.date,
        procedure_reference: undefined,
        procedure_code: p.procedure_code,
      })),

      diagnosis: (previousClaim.diagnosis || []).map((d) => ({
        sequence: d.sequence,
        type: d.type || [],
        diagnosis_reference: undefined,
        diagnosis_code: d.diagnosis_code,
        on_admission: d.on_admission,
      })),

      insurance: (() => {
        const mapped = (previousClaim.insurance || []).map((ins, idx) => ({
          sequence:
            typeof ins.sequence === "number" && ins.sequence > 0
              ? ins.sequence
              : idx + 1,
          focal: !!ins.focal,
          policy: ins.policy,
        }));
        if (mapped.length > 0 && !mapped.some((i) => i.focal)) {
          mapped[0].focal = true;
        }
        return mapped;
      })(),

      item: (previousClaim.item || []).map((it) => ({
        sequence: it.sequence,
        care_team_sequence: it.care_team_sequence || [],
        diagnosis_sequence: it.diagnosis_sequence || [],
        procedure_sequence: it.procedure_sequence || [],
        information_sequence: it.information_sequence || [],
        category: it.category,
        product_or_service: it.product_or_service,
        charge_items: [],
        modifier: it.modifier ?? [],
        program_code:
          it.program_code && it.program_code.length > 0
            ? it.program_code
            : [DEFAULT_PROGRAM_CODE],
        serviced_period: it.serviced_period,
        quantity: it.quantity,
        unit_price: it.unit_price,
        factor: it.factor,
      })),

      accident: previousClaim.accident ?? undefined,
      payment: undefined,

      // Sequences are recomputed on submit to stay unique across the response.
      questionnaire_responses: (
        previousClaim.questionnaire_responses ?? []
      ).map((qr) => ({
        sequence: 0,
        questionnaire: qr.questionnaire,
        category: qr.category,
        code: qr.code,
        item: qr.item,
      })),
    };

    form.reset(mappedValues, { keepDefaultValues: false });
    setPrefillNonce((n) => n + 1);
  }, [form, previousClaim, lockedUse, flowKind, relatedClaimId]);

  // ─── CE:AR prefill (PA via CE:AR) ─────────────────────────────────────────
  //
  // Seeds the form from the CE request's insurance, items, diagnoses, and
  // supporting documents. Item ↔ supporting-info linkages from the CE request
  // are preserved so the resulting pre-authorisation lists supporting info at
  // item level, matching how validation is sourced from the CE response.
  useEffect(() => {
    if (flowKind !== "via-ce-ar") return;
    if (!coverageEligibilityRequest) return;
    if (didPrefillCeRef.current) return;

    didPrefillCeRef.current = true;

    const ceItems = coverageEligibilityRequest.item ?? [];
    const ceSupportingInfo = coverageEligibilityRequest.supporting_info ?? [];
    const ceInsurance = coverageEligibilityRequest.insurance ?? [];

    const seenDiagnoses = new Map<string, number>();
    const diagnoses: z.infer<typeof createClaimFormSchema>["diagnosis"] = [];
    let diagnosisSeq = 1;
    for (const it of ceItems) {
      for (const d of it.diagnosis ?? []) {
        const codeKey = d.diagnosis_code?.code;
        if (!codeKey || seenDiagnoses.has(codeKey)) continue;
        seenDiagnoses.set(codeKey, diagnosisSeq);
        diagnoses.push({
          sequence: diagnosisSeq++,
          type: [DEFAULT_DIAGNOSIS_TYPE],
          diagnosis_reference: undefined,
          diagnosis_code: d.diagnosis_code,
          on_admission: "unknown",
        });
      }
    }

    const supportingInfo: z.infer<
      typeof createClaimFormSchema
    >["supporting_info"] = ceSupportingInfo
      .filter((s) => s.value_string || s.value_attachment)
      .map((s) => ({
        sequence: s.sequence,
        category: DEFAULT_SUPPORTING_INFO_CATEGORY,
        code: DEFAULT_SUPPORTING_INFO_CODE,
        timing: undefined,
        value_string: s.value_string,
        value_attachment: s.value_attachment as unknown as string | undefined,
        _is_plan_level: false,
      }));
    const validSiSeqs = new Set(supportingInfo.map((s) => s.sequence));

    const items: z.infer<typeof createClaimFormSchema>["item"] = ceItems.map(
      (it, idx) => {
        const dxSeqs = (it.diagnosis ?? [])
          .map((d) => seenDiagnoses.get(d.diagnosis_code?.code ?? ""))
          .filter((s): s is number => typeof s === "number");
        const infoSeqs = (it.supporting_info_sequence ?? []).filter((s) =>
          validSiSeqs.has(s)
        );
        return {
          sequence: idx + 1,
          care_team_sequence: [],
          diagnosis_sequence: dxSeqs,
          procedure_sequence: [],
          information_sequence: infoSeqs,
          category: it.category ?? DEFAULT_ITEM_CATEGORY,
          product_or_service: it.product_or_service,
          charge_items: [],
          modifier: it.modifier ?? [],
          program_code: [DEFAULT_PROGRAM_CODE],
          serviced_period: undefined,
          quantity: {
            value: it.quantity?.value > 0 ? it.quantity.value : 1,
            unit: it.quantity?.unit,
          },
          unit_price: it.unit_price > 0 ? it.unit_price : 1,
          factor: undefined,
        };
      }
    );

    const current = form.getValues();

    // Ensure sequences are always valid positive integers and at least one is focal.
    const mappedInsurance = ceInsurance.map((ins, idx) => ({
      sequence:
        typeof ins.sequence === "number" && ins.sequence > 0
          ? ins.sequence
          : idx + 1,
      focal: !!ins.focal,
      policy: ins.policy,
    }));
    if (mappedInsurance.length > 0 && !mappedInsurance.some((i) => i.focal)) {
      mappedInsurance[0].focal = true;
    }

    form.reset(
      {
        ...current,
        use: lockedUse ?? current.use,
        priority: current.priority ?? "normal",
        related: current.related ?? [],
        care_team: [],
        procedure: [],
        diagnosis: diagnoses,
        supporting_info: supportingInfo,
        insurance: mappedInsurance,
        item: items,
        questionnaire_responses: [],
      },
      { keepDefaultValues: false }
    );
    setPrefillNonce((n) => n + 1);
  }, [flowKind, coverageEligibilityRequest, form, lockedUse]);

  // ─── Total wallet-balance cap from CE:validation ───────────────────────────
  const validationBalance = useMemo(() => {
    const insurances = ceValidation?.latest_response?.insurances;
    if (!insurances?.length) return null;
    const primary =
      insurances.find((i) => i.is_primary) ?? insurances[0];
    if (!primary?.balance) return null;
    const available =
      primary.balance.allowed.value - primary.balance.used.value;
    return available >= 0 ? available : 0;
  }, [ceValidation]);

  const watchedItemsForTotal = form.watch("item");
  useEffect(() => {
    if (validationBalance === null) {
      form.setValue("_total_amount_cap_error", undefined);
      return;
    }
    const total = (watchedItemsForTotal ?? []).reduce((sum, item) => {
      return (
        sum +
        (item.unit_price || 0) *
          (item.quantity?.value || 1) *
          (item.factor || 1)
      );
    }, 0);
    if (total > validationBalance) {
      form.setValue(
        "_total_amount_cap_error",
        `Total claim amount ₹${total.toFixed(2)} exceeds available wallet balance of ₹${validationBalance.toFixed(2)}`
      );
    } else {
      form.setValue("_total_amount_cap_error", undefined);
    }
  }, [watchedItemsForTotal, validationBalance, form]);

  const { mutate: submitClaim } = useMutation({
    mutationFn: apis.claim.submit,
    onSuccess: () => {
      toast.success("Claim submitted successfully");
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`
      );
    },
  });

  const { mutate: createClaim, isPending: createClaimIsPending } = useMutation({
    mutationFn: apis.claim.create,
    onSuccess: (data) => {
      form.reset();
      toast.success("Claim created successfully");
      submitClaim(data.id);
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
    },
  });

  async function onSubmit(values: z.infer<typeof createClaimFormSchema>) {
    try {
      const updatedValues = { ...values };

      if (updatedValues.supporting_info?.length) {
        for (let i = 0; i < updatedValues.supporting_info.length; i++) {
          const info = updatedValues.supporting_info[i];

          if (info.value_file && !info.value_attachment) {
            try {
              const fileUploadRequest = {
                file_type: "encounter" as const,
                file_category: "unspecified" as const,
                name: info.value_file.name,
                associating_id: encounterId,
                original_name: info.value_file.name,
                mime_type: info.value_file.type,
              };

              const uploadResponse = await uploadFile(
                info.value_file,
                fileUploadRequest
              );

              updatedValues.supporting_info[i].value_attachment =
                uploadResponse.id;

              delete updatedValues.supporting_info[i].value_file;
            } catch (error) {
              console.error("Error uploading file:", error);
              throw new Error(
                `Failed to upload file: ${info.value_file?.name}`
              );
            }
          }
        }
      }

      // Recompute globally unique sequences for questionnaire_responses so
      // they never collide with supporting_info sequences, then update each
      // item's information_sequence to use the new values.
      if (updatedValues.questionnaire_responses?.length) {
        const maxSupportingInfoSeq = Math.max(
          0,
          ...(updatedValues.supporting_info ?? []).map((s) => s.sequence)
        );
        const seqMap = new Map<number, number>();
        updatedValues.questionnaire_responses =
          updatedValues.questionnaire_responses.map((qr, idx) => {
            const newSeq = maxSupportingInfoSeq + idx + 1;
            seqMap.set(qr.sequence, newSeq);
            return { ...qr, sequence: newSeq };
          });

        if (seqMap.size > 0 && updatedValues.item) {
          updatedValues.item = updatedValues.item.map((item) => ({
            ...item,
            information_sequence: item.information_sequence.map(
              (seq) => seqMap.get(seq) ?? seq
            ),
          }));
        }
      }

      if (updatedValues.supporting_info) {
        updatedValues.supporting_info.forEach((info) => {
          delete (info as Record<string, unknown>)._is_plan_level;
        });
      }

      createClaim(updatedValues);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  }

  const previousClaimResponse = previousClaim?.latest_response;
  const showPayerQuery =
    flowKind === "via-related" &&
    !!previousClaimResponse &&
    previousClaimResponse.outcome === "queued";
  const payerQueryContext: "preauthorization" | "claim" =
    previousClaim?.use === "claim" ? "claim" : "preauthorization";

  const formUse = form.watch("use");

  return (
    <GlobalStoreProvider
      initialStore={{
        encounterId,
        patientId,
        facilityId,
      }}
    >
      <div className="space-y-6">
        <PmjayBiometricVerificationGate
          encounterId={encounterId}
          insurance={insuranceSelection || []}
        />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              {lockedUse === "preauthorization"
                ? "Submit Pre-Authorization"
                : lockedUse === "claim"
                ? "Submit Claim"
                : "Create Claim"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {lockedUse === "preauthorization"
                ? "Request pre-authorisation from the payer for the planned procedures."
                : lockedUse === "claim"
                ? "Submit the final claim to the payer."
                : "Create a new claim for the patient."}
            </p>
            {coverageEligibilityId && (
              <p className="text-xs text-muted-foreground mt-1">
                Linked to coverage eligibility{" "}
                <span className="font-mono">#{coverageEligibilityId}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigate(
                `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`
              );
            }}
          >
            Back to Encounter
          </Button>
        </div>
        <Separator />

        {showPayerQuery && (
          <PayerQueryBanner
            message={previousClaimResponse?.disposition ?? undefined}
            createdAt={previousClaimResponse?.created_date}
            context={payerQueryContext}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {flowKind === "via-related" && (
                  <>
                    <ClaimRelatedSection
                      form={form}
                      lockedClaimId={relatedClaimId}
                    />
                    <Separator />
                  </>
                )}
                <ClaimInsuranceSection
                  form={form}
                  readOnly={flowKind !== "fresh"}
                />
                <Separator />
                <PlanLevelSupportingInfoSection
                  form={form}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  claimUse={formUse}
                />
                <Separator />
                <PlanLevelQuestionnairesSection
                  form={form}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  claimUse={formUse}
                />
                <Separator />
                <ClaimItemSection
                  key={`items-${prefillNonce}`}
                  form={form}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  previousClaim={previousClaim}
                  encounterChargeItems={encounterChargeItems ?? []}
                />
                <Separator />
                <ClaimAccidentSection form={form} />
                <Separator />
                <ClaimOtherSection form={form} lockedUse={lockedUse} />
                <Separator />

                {form.watch("_total_amount_cap_error") && (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      {form.watch("_total_amount_cap_error")}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  loading={createClaimIsPending}
                >
                  Create Claim
                </Button>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-1">
            <InsurancePlanDetailsPanel
              selectedInsurances={form.watch("insurance") || []}
            />
          </div>
        </div>
      </div>
    </GlobalStoreProvider>
  );
};

export default CreateClaimPage;
