import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CLAIM_USE_CHOICES,
  Claim,
  ClaimUseChoice,
} from "@/types/claim";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { Condition, ConditionCategory } from "@/types/condition";
import {
  DEFAULT_ITEM_CATEGORY,
  DEFAULT_PROGRAM_CODE,
  DEFAULT_RELATED_RELATIONSHIP,
  DEFAULT_SUPPORTING_INFO_CATEGORY,
  DEFAULT_SUPPORTING_INFO_CODE,
  applyEncounterPrefill,
  buildEncounterCareTeam,
  buildEncounterDiagnoses,
  chargeItemHasCoding,
  encounterServicedPeriod,
  mergeDiagnosesWithEncounter,
  mergeServicedPeriod,
  parsePositiveNumber,
} from "@/lib/prefill";
import { normalizeImplantItemsFromPrefill } from "@/lib/benefit-item-validation";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import {
  PlanLevelQuestionnairesSection,
  PlanLevelSupportingInfoSection,
} from "./claim-plan-level-section";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useQueryParams } from "raviger";

import { AlertCircleIcon, ChevronDownIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChargeItem } from "@/types/charge_item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClaimAccidentSection } from "./claim-accident-section";
import { ClaimInsuranceSection } from "./claim-insurance-section";
import { ClaimItemSection } from "./claim-item-section";
import { ClaimOtherSection } from "./claim-other-section";
import { ClaimRelatedSection } from "./claim-related-section";
import { Encounter, EncounterClass } from "@/types/encounter";
import { FileUploadModel } from "@/types/file_upload";
import { Form } from "@/components/ui/form";
import { GlobalStoreProvider, useGlobalStore } from "@/hooks/use-global-store";
import { InsurancePlanDetailsPanel } from "../insurance-plan-details-panel";
import PayerQueryBanner from "@/components/common/payer-query-banner";
import { FormPrefillSkeleton } from "@/components/common/form-prefill-skeleton";
import { PmjayBiometricVerificationGate } from "@/components/common/pmjay-biometric-verification-gate";
import { Separator } from "../ui/separator";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import {
  clearResubmitIntent,
  hasResubmitIntent,
} from "@/lib/resubmit-intent";
import { createClaimFormSchema } from "./schema";
import { CLAIM_DISCHARGE_DISPOSITION_STORE_KEY } from "./questionnaire-helpers";
import { LamaDamaFlowController } from "./lama-dama-flow-controller";
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

type ClaimFormValues = z.infer<typeof createClaimFormSchema>;

function ClaimEncounterStoreSync({
  encounter,
}: {
  encounter: Encounter | undefined;
}) {
  const { setStore } = useGlobalStore();

  useEffect(() => {
    setStore(
      CLAIM_DISCHARGE_DISPOSITION_STORE_KEY,
      encounter?.hospitalization?.discharge_disposition,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter?.hospitalization?.discharge_disposition]);

  return null;
}

function claimProviderUsernameMap(claim: Claim): Map<string, string> {
  return new Map(
    (claim.care_team ?? [])
      .filter((member) => member.provider?.id && member.provider?.username)
      .map((member) => [member.provider.id, member.provider.username] as const),
  );
}

function mapClaimInsurance(
  insurance: Claim["insurance"],
): ClaimFormValues["insurance"] {
  const mapped = (insurance || []).map((ins, idx) => ({
    sequence:
      typeof ins.sequence === "number" && ins.sequence > 0 ? ins.sequence : idx + 1,
    focal: !!ins.focal,
    policy: ins.policy,
  }));
  if (mapped.length > 0 && !mapped.some((i) => i.focal)) {
    mapped[0].focal = true;
  }
  return mapped;
}

function mapClaimSupportingInfo(
  claim: Claim,
): ClaimFormValues["supporting_info"] {
  const itemInfoSeqs = new Set(
    (claim.item || []).flatMap((it) => it.information_sequence || []),
  );
  return (claim.supporting_info || []).map((s) => ({
    sequence: s.sequence,
    category: s.category,
    code: s.code,
    timing: s.timing,
    value_string: s.value_string,
    value_attachment: s.value_attachment as unknown as string,
    _is_plan_level: !itemInfoSeqs.has(s.sequence),
  }));
}

function mapClaimItems(
  claim: Claim,
  encounterPeriod?: ReturnType<typeof encounterServicedPeriod>,
): ClaimFormValues["item"] {
  const items = (claim.item || []).map((it) => ({
    sequence: it.sequence,
    care_team_sequence: it.care_team_sequence || [],
    diagnosis_sequence: it.diagnosis_sequence || [],
    procedure_sequence: it.procedure_sequence || [],
    information_sequence: it.information_sequence || [],
    category: it.category,
    product_or_service: it.product_or_service,
    charge_items: (it.charge_items ?? []).map((ci) => ci.id),
    modifier: it.modifier ?? [],
    program_code:
      it.program_code && it.program_code.length > 0
        ? it.program_code
        : [DEFAULT_PROGRAM_CODE],
    serviced_period: mergeServicedPeriod(it.serviced_period, encounterPeriod),
    quantity: it.quantity,
    unit_price: 0,
    factor: it.factor,
  }));
  return normalizeImplantItemsFromPrefill(items);
}

function mapClaimToFormValues(
  claim: Claim,
  current: ClaimFormValues,
  lockedUse: ClaimUseChoice | null,
  relatedClaimId?: string,
  encounterPeriod?: ReturnType<typeof encounterServicedPeriod>,
  encounter?: Encounter | null,
  encounterDiagnoses?: Condition[],
): ClaimFormValues {
  const baseValues: ClaimFormValues = {
    facility: current.facility,
    patient: current.patient,
    encounter: current.encounter,
    use: lockedUse ?? claim.use,
    status: "active",
    priority: claim.priority,
    type: claim.type,
    billable_period: claim.billable_period,
    related: (current.related || []).map((r) =>
      r.claim === relatedClaimId
        ? {
            ...r,
            relationship: r.relationship ?? DEFAULT_RELATED_RELATIONSHIP,
            reference:
              r.reference || claim.latest_response?.pre_auth_ref || "",
          }
        : r,
    ),
    care_team:
      (claim.care_team || []).map((m) => ({
        sequence: m.sequence,
        provider: m.provider?.id,
        responsible: m.responsible ?? false,
        role: m.role,
      })) || [],
    supporting_info: mapClaimSupportingInfo(claim),
    procedure: (claim.procedure || []).map((p) => ({
      sequence: p.sequence,
      type: p.type || [],
      date: p.date,
      procedure_reference: undefined,
      procedure_code: p.procedure_code,
    })),
    diagnosis: (claim.diagnosis || []).map((d) => ({
      sequence: d.sequence,
      type: d.type || [],
      diagnosis_reference: undefined,
      diagnosis_code: d.diagnosis_code,
      on_admission: d.on_admission,
    })),
    insurance: mapClaimInsurance(claim.insurance),
    item: mapClaimItems(claim, encounterPeriod),
    accident: claim.accident ?? undefined,
    payment: undefined,
    questionnaire_responses: (claim.questionnaire_responses ?? []).map((qr) => ({
      sequence: 0,
      questionnaire: qr.questionnaire,
      category: qr.category,
      code: qr.code,
      item: qr.item,
    })),
  };

  return applyEncounterPrefill(
    baseValues,
    encounter,
    encounterDiagnoses ?? [],
    { providerUsernameById: claimProviderUsernameMap(claim) },
  );
}

function buildCePrefillValues(
  coverageEligibilityRequest: CoverageEligibilityRequest,
  current: ClaimFormValues,
  lockedUse: ClaimUseChoice | null,
  encounterPeriod?: ReturnType<typeof encounterServicedPeriod>,
  encounter?: Encounter | null,
  encounterDiagnoses?: Condition[],
): ClaimFormValues {
  const ceItems = coverageEligibilityRequest.item ?? [];
  const ceSupportingInfo = coverageEligibilityRequest.supporting_info ?? [];
  const ceInsurance = coverageEligibilityRequest.insurance ?? [];

  const ceExtraDiagnoses = ceItems.flatMap((it) =>
    (it.diagnosis ?? []).map((d) => ({
      diagnosis_code: d.diagnosis_code,
    })),
  );

  const ceDiagnosis = mergeDiagnosesWithEncounter([], [], ceExtraDiagnoses);

  const supportingInfo: ClaimFormValues["supporting_info"] = ceSupportingInfo
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

  const items: ClaimFormValues["item"] = ceItems.map((it, idx) => {
    const infoSeqs = (it.supporting_info_sequence ?? []).filter((s) =>
      validSiSeqs.has(s),
    );
    return {
      sequence: idx + 1,
      care_team_sequence: [],
      diagnosis_sequence: [],
      procedure_sequence: [],
      information_sequence: infoSeqs,
      category: it.category ?? DEFAULT_ITEM_CATEGORY,
      product_or_service: it.product_or_service,
      charge_items: (it.charge_items ?? []).map((ci) => ci.id),
      modifier: it.modifier ?? [],
      program_code: [DEFAULT_PROGRAM_CODE],
      serviced_period: encounterPeriod,
      quantity: {
        value: it.quantity?.value > 0 ? it.quantity.value : 1,
        unit: it.quantity?.unit,
      },
      unit_price: 0,
      factor: undefined,
    };
  });

  return applyEncounterPrefill(
    {
      ...current,
      status: "active",
      use: lockedUse ?? current.use,
      priority: current.priority ?? "normal",
      related: current.related ?? [],
      care_team: [],
      procedure: [],
      diagnosis: ceDiagnosis,
      supporting_info: supportingInfo,
      insurance: mapClaimInsurance(ceInsurance),
      item: normalizeImplantItemsFromPrefill(items),
      questionnaire_responses: [],
    },
    encounter,
    encounterDiagnoses ?? [],
  );
}

function overlayClaimOnCePrefill(
  ceValues: ClaimFormValues,
  claim: Claim,
  relatedClaimId?: string,
  encounter?: Encounter | null,
  encounterDiagnoses?: Condition[],
): ClaimFormValues {
  const claimItemsByCode = new Map(
    (claim.item ?? [])
      .filter((it) => it.product_or_service?.code)
      .map((it) => [it.product_or_service.code, it] as const),
  );

  const mergedItems = ceValues.item.map((ceItem) => {
    const code = ceItem.product_or_service?.code;
    const claimItem = code ? claimItemsByCode.get(code) : undefined;
    if (!claimItem) return ceItem;

    return {
      ...ceItem,
      care_team_sequence:
        claimItem.care_team_sequence?.length > 0
          ? claimItem.care_team_sequence
          : ceItem.care_team_sequence,
      diagnosis_sequence:
        claimItem.diagnosis_sequence?.length > 0
          ? claimItem.diagnosis_sequence
          : ceItem.diagnosis_sequence,
      procedure_sequence: claimItem.procedure_sequence || [],
      information_sequence:
        claimItem.information_sequence?.length > 0
          ? claimItem.information_sequence
          : ceItem.information_sequence,
      category: claimItem.category ?? ceItem.category,
      charge_items: (claimItem.charge_items ?? []).map((ci) => ci.id),
      modifier: claimItem.modifier ?? [],
      program_code:
        claimItem.program_code && claimItem.program_code.length > 0
          ? claimItem.program_code
          : ceItem.program_code,
      serviced_period: mergeServicedPeriod(
        claimItem.serviced_period,
        ceItem.serviced_period,
      ),
      quantity: claimItem.quantity ?? ceItem.quantity,
      unit_price: 0,
      factor: claimItem.factor,
    };
  });

  return applyEncounterPrefill(
    {
      ...ceValues,
      priority: claim.priority,
      type: claim.type,
      billable_period: claim.billable_period,
      care_team:
        (claim.care_team || []).map((member) => ({
          sequence: member.sequence,
          provider: member.provider?.id,
          responsible: member.responsible ?? false,
          role: member.role,
        })) || [],
      diagnosis: (claim.diagnosis || []).map((entry) => ({
        sequence: entry.sequence,
        type: entry.type || [],
        diagnosis_reference: undefined,
        diagnosis_code: entry.diagnosis_code,
        on_admission: entry.on_admission,
      })),
      procedure: (claim.procedure || []).map((p) => ({
        sequence: p.sequence,
        type: p.type || [],
        date: p.date,
        procedure_reference: undefined,
        procedure_code: p.procedure_code,
      })),
      supporting_info: mapClaimSupportingInfo(claim),
      accident: claim.accident ?? undefined,
      questionnaire_responses: (claim.questionnaire_responses ?? []).map((qr) => ({
        sequence: 0,
        questionnaire: qr.questionnaire,
        category: qr.category,
        code: qr.code,
        item: qr.item,
      })),
      related: (ceValues.related || []).map((r) =>
        r.claim === relatedClaimId
          ? {
              ...r,
              relationship: r.relationship ?? DEFAULT_RELATED_RELATIONSHIP,
              reference:
                r.reference || claim.latest_response?.pre_auth_ref || "",
            }
          : r,
      ),
      item: normalizeImplantItemsFromPrefill(mergedItems),
    },
    encounter,
    encounterDiagnoses ?? [],
    { providerUsernameById: claimProviderUsernameMap(claim) },
  );
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
    [queryParams?.use],
  );

  const coverageEligibilityId = useMemo(
    () => parseStringParam(queryParams?.coverage_eligibility),
    [queryParams?.coverage_eligibility],
  );

  const relatedClaimId = useMemo(
    () => parseStringParam(queryParams?.related),
    [queryParams?.related],
  );

  const prefilledClaimId = useMemo(
    () => parseStringParam(queryParams?.claim),
    [queryParams?.claim],
  );

  // Guided flows pass `coverage_eligibility` and/or `claim` query params.
  // `related` only wires FHIR related-claim linkage — it does not drive prefill.
  const isGuidedFlow = !!(coverageEligibilityId || prefilledClaimId);

  const form = useForm<z.infer<typeof createClaimFormSchema>>({
    resolver: zodResolver(createClaimFormSchema),
    mode: "onChange",
    defaultValues: {
      facility: facilityId,
      patient: patientId,
      encounter: encounterId,
      status: "active",
      priority: "normal",
      use: lockedUse ?? undefined,
    },
  });

  const { isDirty, isValid } = useFormState({ control: form.control });
  const [hasBulkPrefill, setHasBulkPrefill] = useState(false);
  const [submitMode, setSubmitMode] = useState<"submit" | "resubmit">("submit");
  const [submitMenuOpen, setSubmitMenuOpen] = useState(false);
  const isUnchangedPrefill = hasBulkPrefill && !isDirty;

  useEffect(() => {
    if (relatedClaimId) {
      const existingRelated = form.getValues("related") || [];
      if (!existingRelated.find((r) => r.claim === relatedClaimId)) {
        form.setValue(
          "related",
          [
            {
              claim: relatedClaimId,
              relationship: DEFAULT_RELATED_RELATIONSHIP,
              reference: "",
            },
            ...existingRelated,
          ],
          { shouldDirty: false },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insuranceSelection = useWatch({
    control: form.control,
    name: "insurance",
  });

  const {
    data: prefilledClaim,
    isFetched: prefilledClaimFetched,
  } = useQuery({
    queryKey: ["claim", prefilledClaimId],
    queryFn: () => apis.claim.get(prefilledClaimId as string),
    enabled: !!prefilledClaimId,
  });

  const { data: relatedClaim } = useQuery({
    queryKey: ["claim", "related", relatedClaimId],
    queryFn: () => apis.claim.get(relatedClaimId as string),
    enabled: !!relatedClaimId,
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
  const didPrefillGuidedRef = useRef(false);
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
      enabled: !!patientId && !!encounterId,
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
    enabled: !!encounterId && !isGuidedFlow,
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
        form.setValue(
          "type",
          {
            code: "737481003",
            system: "http://snomed.info/sct",
            display: "Inpatient care management",
          },
          { shouldDirty: false },
        );
        break;
      case EncounterClass.outpatient:
        form.setValue(
          "type",
          {
            code: "737492002",
            system: "http://snomed.info/sct",
            display: "Outpatient care management",
          },
          { shouldDirty: false },
        );
        break;
      case EncounterClass.observation:
        form.setValue(
          "type",
          {
            code: "737492002",
            system: "http://snomed.info/sct",
            display: "Outpatient care management",
          },
          { shouldDirty: false },
        );
        break;
      case EncounterClass.emergency:
        form.setValue(
          "type",
          {
            code: "737481003",
            system: "http://snomed.info/sct",
            display: "Inpatient care management",
          },
          { shouldDirty: false },
        );
        break;
      case EncounterClass.virtual:
        form.setValue(
          "type",
          {
            code: "713603004",
            system: "http://snomed.info/sct",
            display: "Advance care planning",
          },
          { shouldDirty: false },
        );
        break;
      case EncounterClass.home:
        form.setValue(
          "type",
          {
            code: "60689008",
            system: "http://snomed.info/sct",
            display: "Home care of patient",
          },
          { shouldDirty: false },
        );
        break;
      default:
        form.setValue(
          "type",
          {
            code: "737850002",
            system: "http://snomed.info/sct",
            display: "Outpatient care management",
          },
          { shouldDirty: false },
        );
        break;
    }
  }, [encounter, form]);

  // Only used when the form is not seeded from either a previous claim or a
  // coverage-eligibility request. New items are now expected to flow through
  // CE:AR; this branch is preserved as a defensive fallback so the form is not
  // empty if the user navigates here directly.
  useEffect(() => {
    if (isGuidedFlow) return;
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

    const diagnosis = buildEncounterDiagnoses(encounterDiagnoses || []);
    const diagnosisSequences = diagnosis.map((d) => d.sequence);

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

    const care_team = buildEncounterCareTeam(encounter);
    const careTeamSequences = care_team.map((m) => m.sequence);

    const codedChargeItems = (encounterChargeItems || []).filter(
      chargeItemHasCoding,
    );

    const encounterPeriod = encounterServicedPeriod(encounter);

    const emptyItemTemplate = {
      care_team_sequence: [...careTeamSequences],
      procedure_sequence: [] as number[],
      category: DEFAULT_ITEM_CATEGORY,
      program_code: [DEFAULT_PROGRAM_CODE] as z.infer<
        typeof createClaimFormSchema
      >["item"][number]["program_code"],
      serviced_period: encounterPeriod,
      factor: undefined,
    };

    const current = form.getValues();
    form.reset(
      {
        ...current,
        diagnosis,
        supporting_info: supportingInfo,
        care_team,
        item:
          codedChargeItems.length > 0
            ? codedChargeItems.map((ci, idx) => ({
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
            : current.item,
      },
      { keepDefaultValues: false },
    );
    if (
      diagnosis.length > 0 ||
      supportingInfo.length > 0 ||
      care_team.length > 0 ||
      codedChargeItems.length > 0
    ) {
      setHasBulkPrefill(true);
    }
    setPrefillNonce((n) => n + 1);
  }, [
    isGuidedFlow,
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

  useEffect(() => {
    if (!isGuidedFlow) return;
    if (didPrefillGuidedRef.current) return;
    if (!encounterFetched || !encounterDiagnosesFetched) return;

    const current = form.getValues();
    const effectiveUse = lockedUse ?? current.use;
    const encounterPeriod = encounterServicedPeriod(encounter);
    const encounterDiagnosisList = encounterDiagnoses ?? [];

    if (effectiveUse === "claim") {
      if (!prefilledClaimId) return;
      if (!prefilledClaimFetched) return;
      if (!prefilledClaim) return;

      didPrefillGuidedRef.current = true;
      form.reset(
        mapClaimToFormValues(
          prefilledClaim,
          current,
          lockedUse,
          relatedClaimId,
          encounterPeriod,
          encounter,
          encounterDiagnosisList,
        ),
        { keepDefaultValues: false },
      );
      setHasBulkPrefill(true);
      setPrefillNonce((n) => n + 1);
      return;
    }

    if (effectiveUse === "preauthorization") {
      if (!coverageEligibilityRequest) return;
      if (prefilledClaimId && !prefilledClaimFetched) return;

      didPrefillGuidedRef.current = true;

      const ceValues = buildCePrefillValues(
        coverageEligibilityRequest,
        current,
        lockedUse,
        encounterPeriod,
        encounter,
        encounterDiagnosisList,
      );
      const finalValues =
        prefilledClaim && prefilledClaimId
          ? overlayClaimOnCePrefill(
              ceValues,
              prefilledClaim,
              relatedClaimId,
              encounter,
              encounterDiagnosisList,
            )
          : ceValues;

      form.reset(finalValues, { keepDefaultValues: false });
      setHasBulkPrefill(true);
      setPrefillNonce((n) => n + 1);
    }
  }, [
    isGuidedFlow,
    lockedUse,
    coverageEligibilityRequest,
    prefilledClaim,
    prefilledClaimId,
    prefilledClaimFetched,
    encounter,
    encounterDiagnoses,
    encounterDiagnosesFetched,
    encounterFetched,
    form,
    relatedClaimId,
  ]);

  const validationBalance = useMemo(() => {
    const insurances = ceValidation?.latest_response?.insurances;
    if (!insurances?.length) return null;
    const primary = insurances.find((i) => i.is_primary) ?? insurances[0];
    if (!primary?.balance) return null;
    const available =
      primary.balance.allowed.value - primary.balance.used.value;
    return available >= 0 ? available : 0;
  }, [ceValidation]);

  const watchedItemsForTotal = form.watch("item");

  // Price lookup for charge items aggregated from every available source. Used
  // to derive each item's effective amount when `unit_price` is still 0 (the
  // per-item effect that fills it runs asynchronously after the form prefill).
  const chargeItemPriceById = useMemo(() => {
    const priceById = new Map<string, number>();
    const addChargeItems = (items?: ChargeItem[]) => {
      (items ?? []).forEach((ci) => {
        if (ci?.id && !priceById.has(ci.id)) {
          priceById.set(ci.id, parseFloat(ci.total_price ?? "0") || 0);
        }
      });
    };
    addChargeItems(encounterChargeItems);
    (coverageEligibilityRequest?.item ?? []).forEach((it) =>
      addChargeItems(it.charge_items),
    );
    (prefilledClaim?.item ?? []).forEach((it) =>
      addChargeItems(it.charge_items),
    );
    return priceById;
  }, [encounterChargeItems, coverageEligibilityRequest, prefilledClaim]);

  const totalClaimAmount = useMemo(() => {
    return (watchedItemsForTotal ?? []).reduce((sum, item) => {
      if (item._is_disabled) return sum;
      const fallbackFromChargeItems = (item.charge_items ?? []).reduce(
        (acc, id) => acc + (chargeItemPriceById.get(id) ?? 0),
        0,
      );
      const unitPrice = item.unit_price || fallbackFromChargeItems;
      return (
        sum +
        unitPrice * (item.quantity?.value || 1) * (item.factor || 1)
      );
    }, 0);
  }, [watchedItemsForTotal, chargeItemPriceById]);

  useEffect(() => {
    if (validationBalance === null) {
      form.setValue("_total_amount_cap_error", undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }
    if (totalClaimAmount > validationBalance) {
      form.setValue(
        "_total_amount_cap_error",
        `The amount requested is ₹${totalClaimAmount.toFixed(2)}, but the available wallet balance is ₹${validationBalance.toFixed(2)}. Please inform the patient before proceeding.`,
        { shouldDirty: false, shouldValidate: true },
      );
    } else {
      form.setValue("_total_amount_cap_error", undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [totalClaimAmount, validationBalance, form]);

  const { mutate: submitClaim, isPending: submitClaimIsPending } = useMutation({
    mutationFn: ({ id, resubmit }: { id: string; resubmit?: boolean }) =>
      apis.claim.submit(id, { resubmit }),
    onSuccess: () => {
      toast.success("Claim submitted successfully");
      clearResubmitIntent(encounterId);
      navigate(
        `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`,
      );
    },
  });

  const { mutate: createClaim, isPending: createClaimIsPending } = useMutation({
    mutationFn: apis.claim.create,
    onSuccess: (data) => {
      form.reset();
      toast.success("Claim created successfully");
      submitClaim({
        id: data.id,
        resubmit: canManuallyResubmit && submitMode === "resubmit",
      });
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
    },
  });

  async function onSubmit(values: z.infer<typeof createClaimFormSchema>) {
    if (isUnchangedPrefill) {
      toast.error("No changes noted. Please update the form before submitting.");
      return;
    }

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
                fileUploadRequest,
              );

              updatedValues.supporting_info[i].value_attachment =
                uploadResponse.id;

              delete updatedValues.supporting_info[i].value_file;
            } catch (error) {
              console.error("Error uploading file:", error);
              throw new Error(
                `Failed to upload file: ${info.value_file?.name}`,
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
          ...(updatedValues.supporting_info ?? []).map((s) => s.sequence),
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
              (seq) => seqMap.get(seq) ?? seq,
            ),
          }));
        }
      }

      if (updatedValues.supporting_info) {
        updatedValues.supporting_info.forEach((info) => {
          delete (info as Record<string, unknown>)._is_plan_level;
        });
      }

      if (updatedValues.item) {
        const implantProductCodes = new Set(
          updatedValues.item
            .filter((it) => it._implant_parent_sequence != null)
            .map((it) => it._implant_code ?? it.product_or_service?.code)
            .filter((code): code is string => Boolean(code)),
        );
        updatedValues.item = updatedValues.item.map((item) => {
          const rest = { ...item };
          for (const key of [
            "_implant_parent_sequence",
            "_implant_code",
            "_is_disabled",
            "_mandatory_docs_error",
            "_mandatory_questionnaires_error",
            "_mandatory_care_team_error",
            "_mandatory_diagnosis_error",
            "_mandatory_charge_items_error",
            "_mandatory_procedure_error",
            "_mandatory_supporting_info_error",
            "_amount_cap_error",
            "_condition_errors",
          ] as const) {
            delete (rest as Record<string, unknown>)[key];
          }
          return {
            ...rest,
            modifier: (rest.modifier ?? []).filter(
              (m) => !implantProductCodes.has(m.code),
            ),
          };
        });
      }

      createClaim(updatedValues);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  }

  const relatedClaimResponse = relatedClaim?.latest_response;
  const showPayerQuery =
    !!relatedClaimId &&
    !!relatedClaimResponse &&
    relatedClaimResponse.outcome === "queued";
  const payerQueryContext: "preauthorization" | "claim" =
    relatedClaim?.use === "claim" ? "claim" : "preauthorization";

  const formUse = form.watch("use");

  // A resubmission is only possible when there is a prior submission of the
  // same use to resubmit against (a same-use related claim). First pre-auth /
  // first claim submissions always follow the auto-derived flow (12 / 15).
  const canManuallyResubmit = !!relatedClaim && relatedClaim.use === formUse;

  // When the user arrived via "Update Items as Resubmit", default the submit
  // action to Resubmit (they can still switch back via the dropdown).
  useEffect(() => {
    if (canManuallyResubmit && hasResubmitIntent(encounterId)) {
      setSubmitMode("resubmit");
    }
  }, [canManuallyResubmit, encounterId]);

  const isFormPrefillLoading = useMemo(() => {
    if (hasBulkPrefill) {
      return false;
    }

    if (!encounterFetched) {
      return true;
    }

    if (isGuidedFlow) {
      const effectiveUse = lockedUse ?? formUse;
      const waitingDiagnoses =
        !!patientId && !!encounterId && !encounterDiagnosesFetched;

      if (effectiveUse === "claim") {
        return (
          waitingDiagnoses ||
          (!!prefilledClaimId && (!prefilledClaimFetched || !prefilledClaim))
        );
      }

      if (coverageEligibilityId && !coverageEligibilityRequest) {
        return true;
      }

      if (prefilledClaimId && !prefilledClaimFetched) {
        return true;
      }

      return waitingDiagnoses || !!coverageEligibilityId;
    }

    const waitingDiagnoses =
      !!patientId && !!encounterId && !encounterDiagnosesFetched;
    const waitingFiles = !!encounterId && !encounterFilesFetched;
    const waitingChargeItems =
      !!facilityId && !!encounterId && !encounterChargeItemsFetched;

    return waitingDiagnoses || waitingFiles || waitingChargeItems;
  }, [
    coverageEligibilityId,
    coverageEligibilityRequest,
    encounterChargeItemsFetched,
    encounterDiagnosesFetched,
    encounterFetched,
    encounterFilesFetched,
    encounterId,
    facilityId,
    formUse,
    hasBulkPrefill,
    isGuidedFlow,
    lockedUse,
    patientId,
    prefilledClaim,
    prefilledClaimFetched,
    prefilledClaimId,
  ]);

  const isSubmitting = createClaimIsPending || submitClaimIsPending;

  return (
    <GlobalStoreProvider
      initialStore={{
        encounterId,
        patientId,
        facilityId,
      }}
    >
      <div className="space-y-6">
        <ClaimEncounterStoreSync encounter={encounter} />
        <LamaDamaFlowController
          form={form}
          encounter={encounter}
          prefilledClaim={prefilledClaim}
          lockedUse={lockedUse}
          isFormReady={!isFormPrefillLoading}
          onLm100ModeApplied={() => setPrefillNonce((n) => n + 1)}
        />
        <PmjayBiometricVerificationGate
          encounterId={encounterId}
          patientId={patientId}
          insurance={insuranceSelection || []}
          process={lockedUse === "claim" ? "Discharge" : "Preauth"}
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
                `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/claims`,
              );
            }}
          >
            Back to Encounter
          </Button>
        </div>
        <Separator />

        {showPayerQuery && (
          <PayerQueryBanner
            message={relatedClaimResponse?.disposition ?? undefined}
            createdAt={relatedClaimResponse?.created_date}
            context={payerQueryContext}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isFormPrefillLoading ? (
              <FormPrefillSkeleton />
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  {relatedClaimId && (
                    <>
                      <ClaimRelatedSection
                        form={form}
                        lockedClaimId={relatedClaimId}
                      />
                      <Separator />
                    </>
                  )}
                  <ClaimInsuranceSection form={form} readOnly={isGuidedFlow} />
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
                    previousClaim={prefilledClaim}
                    encounterChargeItems={encounterChargeItems ?? []}
                  />
                  <Separator />
                  <ClaimAccidentSection form={form} />
                  <Separator />
                  <ClaimOtherSection form={form} lockedUse={lockedUse} />
                  <Separator />

                  <WalletBalanceSummary
                    totalAmount={totalClaimAmount}
                    walletBalance={validationBalance}
                  />

                  {form.watch("_total_amount_cap_error") && (
                    <Alert variant="destructive">
                      <AlertCircleIcon className="h-4 w-4" />
                      <AlertDescription>
                        {form.watch("_total_amount_cap_error")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isUnchangedPrefill && (
                    <Alert
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <AlertCircleIcon className="h-4 w-4" />
                      <AlertDescription>
                        No changes noted. Please update the form before
                        submitting.
                      </AlertDescription>
                    </Alert>
                  )}

                  {(() => {
                    const submitDisabled =
                      isUnchangedPrefill ||
                      isFormPrefillLoading ||
                      !isValid ||
                      !!form.watch("_total_amount_cap_error");
                    const submitLabel =
                      submitMode === "resubmit"
                        ? "Create & Resubmit Claim"
                        : "Create Claim";

                    if (!canManuallyResubmit) {
                      return (
                        <Button
                          className="w-full"
                          size="lg"
                          type="submit"
                          loading={isSubmitting}
                          disabled={submitDisabled}
                        >
                          Create Claim
                        </Button>
                      );
                    }

                    return (
                      <div className="flex w-full">
                        <Button
                          className="flex-1 rounded-r-none"
                          size="lg"
                          type="submit"
                          loading={isSubmitting}
                          disabled={submitDisabled}
                        >
                          {submitLabel}
                        </Button>
                        <Popover
                          open={submitMenuOpen}
                          onOpenChange={setSubmitMenuOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              size="lg"
                              className="rounded-l-none border-l border-l-primary-foreground/20 px-3"
                              disabled={isSubmitting}
                              aria-label="Submit options"
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-1">
                            <div className="flex flex-col">
                              <button
                                type="button"
                                className={cn(
                                  "flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-left",
                                  submitMode === "submit" && "bg-gray-100",
                                )}
                                onClick={() => {
                                  setSubmitMode("submit");
                                  setSubmitMenuOpen(false);
                                }}
                              >
                                <span className="font-medium">Submit</span>
                                <span className="text-xs text-muted-foreground">
                                  Follow the normal workflow.
                                </span>
                              </button>
                              <button
                                type="button"
                                className={cn(
                                  "flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-left",
                                  submitMode === "resubmit" && "bg-gray-100",
                                )}
                                onClick={() => {
                                  setSubmitMode("resubmit");
                                  setSubmitMenuOpen(false);
                                }}
                              >
                                <span className="font-medium">Resubmit</span>
                                <span className="text-xs text-muted-foreground">
                                  Force the resubmit workflow code.
                                </span>
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })()}
                </form>
              </Form>
            )}
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

function WalletBalanceSummary({
  totalAmount,
  walletBalance,
}: {
  totalAmount: number;
  walletBalance: number | null;
}) {
  if (walletBalance === null) return null;
  const remaining = walletBalance - totalAmount;
  const exceeded = remaining < 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <WalletIcon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Wallet balance summary</h4>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Total claim amount</p>
          <p className="font-semibold">₹{totalAmount.toFixed(2)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Available wallet balance
          </p>
          <p className="font-semibold">₹{walletBalance.toFixed(2)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {exceeded ? "Over by" : "Remaining"}
          </p>
          <p
            className={cn(
              "font-semibold",
              exceeded ? "text-red-600" : "text-emerald-600",
            )}
          >
            ₹{Math.abs(remaining).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateClaimPage;
