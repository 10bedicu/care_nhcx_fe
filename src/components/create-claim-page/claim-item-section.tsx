import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Claim, ClaimResponse, ClaimUseChoice } from "@/types/claim";
import { FileIcon, TrashIcon } from "lucide-react";
import {
  FormCardErrorFooter,
  SectionErrorMessage,
  SectionValidationBadges,
  cardErrorBorderClass,
  sectionErrorBorderClass,
} from "@/components/common/form-card-error";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useController, useFieldArray } from "react-hook-form";
import {
  buildBenefitConditionErrors,
  computeBenefitLimit,
  getQualifierTypeByCode,
  isModifierRequired,
} from "@/lib/benefit-item-validation";
import {
  formatItemQueryReasons,
  getItemResponseAdjudication,
  isItemQueried,
} from "@/lib/claim-response";
import {
  getCardSectionValidationCounts,
  getChecklistValidationCounts,
  getClaimCareTeamCardError,
  getClaimDiagnosisCardError,
  getClaimProcedureCardError,
  getClaimSupportingInfoCardError,
  getSectionVirtualErrorMessage,
  hasSectionValidationIssue,
  mergeValidationCounts,
  syncVirtualFormErrorFromForm,
} from "@/lib/form-card-validation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AddQuestionnaireSection } from "./claim-questionnaire-section";
import { SupportingInfoValueControls } from "./supporting-info-value-controls";
import Autocomplete from "../ui/autocomplete";
import { Badge } from "../ui/badge";
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { ChargeItem } from "@/types/charge_item";
import { Checkbox } from "../ui/checkbox";
import { Coding } from "@/types/base";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { DateTimePicker } from "../ui/date-time-picker";
import { InlineLoading } from "@/components/common/loading-spinner";
import { Input } from "../ui/input";
import { InsurancePlanSupportingInfoRequirement } from "@/types/insurance_plan";
import { Label } from "../ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import { chargeItemLabel } from "@/lib/prefill";
import { cn } from "@/lib/utils";
import { createClaimFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/** Marks user-driven updates so prefilled claim forms enable submit. */
const USER_EDIT = { shouldDirty: true, shouldValidate: true } as const;

interface ClaimItemSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  encounterChargeItems?: ChargeItem[];
  queryResponse?: ClaimResponse;
}

const PROGRAM_CODES = [
  {
    code: "ESIC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "ESIC",
  },
  {
    code: "PIP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Add private insurance program(PIP)",
  },
  {
    code: "CAPF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "CAPF",
  },
  {
    code: "HMDG",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "RAN/HMDG",
  },
  {
    code: "STATE",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "STATE SCHEMES",
  },
  {
    code: "MAA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display:
      "MAA (Mothers’ Absolute Affection) Programme for Infant and Young Child Feeding",
  },
  {
    code: "NIPIAC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Iron Plus Initiative for Anaemia Control",
  },
  {
    code: "NVAPP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Vitamin A prophylaxis Programe",
  },
  {
    code: "ICDS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Integrated Child Development Services",
  },
  {
    code: "MDMP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Mid-Day Meal Programme",
  },
  {
    code: "NTEP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Tuberculosis Elimination Programme",
  },
  {
    code: "PPP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Pulse Polio Programme",
  },
  {
    code: "NPCTOD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display:
      "National Programme for Control Treatment of Occupational Diseases",
  },
  {
    code: "PMNDP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Pradhan Mantri National Dialysis Programme",
  },
  {
    code: "LaQshya",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "LaQshya’ programme (Labour Room Quality Improvement Initiative)",
  },
  {
    code: "NHM",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Health Mission",
  },
  {
    code: "PM-ABHIM",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "PM Ayushman Bharat Health Infrastructure Mission",
  },
  {
    code: "PHI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Private Health Insurance",
  },
  {
    code: "AB-PMJAY",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
  },
  {
    code: "CGHS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Central Government Health Scheme (CGHS)",
  },
  {
    code: "ECHS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Ex-Servicemen Contributory Health Scheme(ECHS)",
  },
  {
    code: "JSSK",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Janani Shishu Suraksha Karyakaram",
  },
  {
    code: "RKSK",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Rashtriya Kishor Swasthya Karyakram",
  },
  {
    code: "RBSK",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Rashtriya Bal SwasthyaKaryakram",
  },
  {
    code: "JSY",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Janani Suraksha Yojana",
  },
  {
    code: "PMSMA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Pradhan Mantri Surakshit Matritva Abhiyan",
  },
  {
    code: "NSSK",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "NavjaatShishu Suraksha Karyakram",
  },
  {
    code: "NPPCF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for Prevention and Control of Fluorosis",
  },
  {
    code: "IDSP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Integrated Disease Surveillance Programme",
  },
  {
    code: "NLEP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Leprosy Eradication Programme",
  },
  {
    code: "NCVBDCP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Centre for Vector Borne Diseases Control Progarmme",
  },
  {
    code: "PPCL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Programme for Prevention and Control of leptospirosis",
  },
  {
    code: "NACP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National AIDS Control Programme",
  },
  {
    code: "NVHCP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Viral Hepatitis Control Program",
  },
  {
    code: "NRCP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Rabies Control Programme",
  },
  {
    code: "AMR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme on Containment of Anti-Microbial Resistance",
  },
  {
    code: "NTCP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Tobacco Control Programme",
  },
  {
    code: "NPCDCS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display:
      "National Programme for Prevention and Control of Cancer, Diabetes, Cardiovascular Diseases & Stroke",
  },
  {
    code: "NPPCD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for Prevention and Control of Deafness",
  },
  {
    code: "NMHP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Mental Health Programme",
  },
  {
    code: "NPCBVI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for Control of Blindness& Visual Impairment",
  },
  {
    code: "NPHCE",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for the Health Care for the Elderly",
  },
  {
    code: "NPPMBI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for Prevention & Management of Burn Injuries",
  },
  {
    code: "NOHP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Oral Health programme",
  },
  {
    code: "NPCCHH",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme on Climate Change & Human Health",
  },
  {
    code: "ABY",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Ayushman Bharat Yojana",
  },
  {
    code: "PMSSY",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Pradhan Mantri Swasthya Suraksha Yojana",
  },
  {
    code: "ABDM",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Ayushman Bharat Digital Mission",
  },
  {
    code: "NPPC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "National Programme for Palliative Care",
  },
  {
    code: "OTH",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-program-code",
    display: "Other",
  },
];

const SUPPORTING_INFO_CODES = [
  {
    code: "AT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Attachment",
  },
  {
    code: "VRCF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Vehicle Registration Certificate / Smart card",
  },
  {
    code: "WB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Water Bill with address",
  },
  {
    code: "EB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Electricity Bill of Govt./private company (not older than 3 months)",
  },
  {
    code: "TB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Telephone Bill of a fixed line. (Any Service Provider)",
  },
  {
    code: "RA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Registered Sale/Lease (Rent) Agreement",
  },
  {
    code: "IAO",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "IT Assessment Order",
  },
  {
    code: "SRIC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Surrender ID Card (BLT etc.) issued by Govt. of India signed by IGP of the state",
  },
  {
    code: "PDS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PDS Card",
  },
  {
    code: "MNREGA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "MNREGA Job Card",
  },
  {
    code: "ACC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Army Canteen Card",
  },
  {
    code: "FED",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Any other Central/ State government issued family entitlement document",
  },
  {
    code: "MCF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Marriage Certificate issued by the government",
  },
  {
    code: "DCF",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-identifier-type-code",
    display: "Domicile Certificate",
  },
  {
    code: "PPN",
    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
    display: "Passport number",
  },
  {
    code: "DL",
    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
    display: "Driver's license number",
  },
];

const SUPPORTING_INFO_CATEGORIES = [
  {
    code: "POI",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Proof of identity",
  },
  {
    code: "POA",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Proof of address",
  },
  {
    code: "DOB",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Proof of Date of Birth",
  },
  {
    code: "POR",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Proof of relation",
  },
  {
    code: "PHT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Photograph",
  },
  {
    code: "BVC",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Benefiaciary verification card",
  },
  {
    code: "DEF",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Declaration form",
  },
  {
    code: "SIG",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Signature",
  },
  {
    code: "FCF",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Filled claim form",
  },
  {
    code: "CER",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Medical Certficate",
  },
  {
    code: "MB",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Medical bill",
  },
  {
    code: "DIA",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Diagnostic report",
  },
  {
    code: "HDS",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Hospital discharge summary",
  },
  {
    code: "REF",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Referal latter",
  },
  {
    code: "DEL",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Doctor signed extention letter",
  },
  {
    code: "CD",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Clinical document",
  },
  {
    code: "EID",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Employee id card",
  },
  {
    code: "FIR",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "FIR copy",
  },
  {
    code: "CIL",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Claim status intimation letter",
  },
  {
    code: "INF",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display:
      "Additional info related to claim ( conveying additional situation and condition information.)",
  },
  {
    code: "DIS",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Discharge status and discharge to location detail",
  },
  {
    code: "ONS",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display:
      "Period, start or end dates of aspects of the Condition. (e.g. admission, discharge etc)",
  },
  {
    code: "REL",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Related service",
  },
  {
    code: "EXC",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Exception",
  },
  {
    code: "MAT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Materials Forwarded",
  },
  {
    code: "ATT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Attachment",
  },
  {
    code: "OTH",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Other",
  },
  {
    code: "COI",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Injury or accident detail",
  },
  {
    code: "VRE",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Patient Reason for Visit",
  },
  {
    code: "CRD",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Claim received",
  },
  {
    code: "NMI",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Claim query detail",
  },
  {
    code: "TRD",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Treatment detail",
  },
  {
    code: "IND",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Indicator flag",
  },
  {
    code: "IMP",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Implant",
  },
  {
    code: "INV",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Investigation",
  },
  {
    code: "DRUG",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Drug",
  },
  {
    code: "PCT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Patient Consent",
  },
  {
    code: "DCT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Doctor Consent",
  },
  {
    code: "HCT",
    system:
      "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-category",
    display: "Document Type - Hospital Consent",
  },
];

const BENEFIT_CATEGORY_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/ValueSet/ndhm-benefitcategory";
const PROCEDURE_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-procedures-code";
const AB_PMJAY_CODE = PROGRAM_CODES.find((c) => c.code === "AB-PMJAY")!;

export function ClaimItemSection({
  form,
  coverageEligibilityRequest,
  previousClaim,
  encounterChargeItems = [],
  queryResponse,
}: ClaimItemSectionProps) {
  const { fields, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

  /**
   * Remove an item and clean up any entries (supporting_info, questionnaire_responses,
   * care_team, diagnosis, procedure) whose sequences are exclusively referenced by
   * the removed item and not shared with any remaining item.
   */
  const removeItemWithCleanup = (index: number) => {
    const removedItem = form.getValues(`item.${index}`);
    const allItems = form.getValues("item");
    const remainingItems = allItems.filter((_, i) => i !== index);

    const infoSeqs = new Set(removedItem.information_sequence ?? []);
    const careTeamSeqs = new Set(removedItem.care_team_sequence ?? []);
    const diagnosisSeqs = new Set(removedItem.diagnosis_sequence ?? []);
    const procedureSeqs = new Set(removedItem.procedure_sequence ?? []);

    const stillUsedInfoSeqs = new Set<number>();
    const stillUsedCareTeamSeqs = new Set<number>();
    const stillUsedDiagnosisSeqs = new Set<number>();
    const stillUsedProcedureSeqs = new Set<number>();

    for (const item of remainingItems) {
      for (const seq of item.information_sequence ?? [])
        stillUsedInfoSeqs.add(seq);
      for (const seq of item.care_team_sequence ?? [])
        stillUsedCareTeamSeqs.add(seq);
      for (const seq of item.diagnosis_sequence ?? [])
        stillUsedDiagnosisSeqs.add(seq);
      for (const seq of item.procedure_sequence ?? [])
        stillUsedProcedureSeqs.add(seq);
    }

    const orphanedInfoSeqs = [...infoSeqs].filter(
      (seq) => !stillUsedInfoSeqs.has(seq),
    );
    if (orphanedInfoSeqs.length > 0) {
      form.setValue(
        "supporting_info",
        (form.getValues("supporting_info") ?? []).filter(
          (info) => !orphanedInfoSeqs.includes(info.sequence),
        ), USER_EDIT);
      form.setValue(
        "questionnaire_responses",
        (form.getValues("questionnaire_responses") ?? []).filter(
          (qr) => !orphanedInfoSeqs.includes(qr.sequence),
        ), USER_EDIT);
    }

    const orphanedCTSeqs = [...careTeamSeqs].filter(
      (seq) => !stillUsedCareTeamSeqs.has(seq),
    );
    if (orphanedCTSeqs.length > 0) {
      form.setValue(
        "care_team",
        (form.getValues("care_team") ?? []).filter(
          (ct) => !orphanedCTSeqs.includes(ct.sequence),
        ), USER_EDIT);
    }

    const orphanedDxSeqs = [...diagnosisSeqs].filter(
      (seq) => !stillUsedDiagnosisSeqs.has(seq),
    );
    if (orphanedDxSeqs.length > 0) {
      form.setValue(
        "diagnosis",
        (form.getValues("diagnosis") ?? []).filter(
          (dx) => !orphanedDxSeqs.includes(dx.sequence),
        ), USER_EDIT);
    }

    const orphanedProcSeqs = [...procedureSeqs].filter(
      (seq) => !stillUsedProcedureSeqs.has(seq),
    );
    if (orphanedProcSeqs.length > 0) {
      form.setValue(
        "procedure",
        (form.getValues("procedure") ?? []).filter(
          (proc) => !orphanedProcSeqs.includes(proc.sequence),
        ), USER_EDIT);
    }

    remove(index);
  };

  const selectedInsurances = form.watch("insurance");
  const focalPolicy =
    selectedInsurances?.find((i) => i.focal)?.policy ??
    selectedInsurances?.[0]?.policy;

  const { data: planListData, isLoading: isPlanLoading } = useQuery({
    queryKey: ["insurancePlan", "list", focalPolicy?.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with focalPolicy!.sno
      }),
    enabled: Boolean(focalPolicy?.sno),
    staleTime: 5 * 60 * 1000,
  });

  const planId = planListData?.results?.[0]?.id ?? null;
  const watchedItems = form.watch("item");
  const claimUse = form.watch("use");

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingBasketIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Claim items</h3>
          <p className="text-sm text-muted-foreground">
            Review the items carried over from coverage eligibility. New items
            must be added via a coverage eligibility (auth requirements)
            request.
          </p>
        </div>
      </div>

      {focalPolicy?.sno && isPlanLoading && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3">
          <InlineLoading label="Loading insurance plan details for procedure search…" />
        </div>
      )}

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground flex items-start gap-2">
          <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <span>
            No items are attached yet. Items flow into this form from a coverage
            eligibility (auth requirements) request.
          </span>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const mandatoryDocsError =
            watchedItems?.[index]?._mandatory_docs_error;
          const mandatoryQuestionnairesError =
            watchedItems?.[index]?._mandatory_questionnaires_error;
          const mandatoryCareTeamError =
            watchedItems?.[index]?._mandatory_care_team_error;
          const mandatoryDiagnosisError =
            watchedItems?.[index]?._mandatory_diagnosis_error;
          const mandatoryChargeItemsError =
            watchedItems?.[index]?._mandatory_charge_items_error;
          const mandatoryProcedureError =
            watchedItems?.[index]?._mandatory_procedure_error;
          const mandatorySupportingInfoError =
            watchedItems?.[index]?._mandatory_supporting_info_error;
          const amountCapError = watchedItems?.[index]?._amount_cap_error;
          const conditionErrors = watchedItems?.[index]?._condition_errors;
          const itemSequence = watchedItems?.[index]?.sequence ?? index + 1;
          const itemQueryAdjudication = getItemResponseAdjudication(
            queryResponse,
            itemSequence,
          );
          const isQueriedItem = isItemQueried(itemQueryAdjudication);
          const itemQueryReasons = formatItemQueryReasons(
            itemQueryAdjudication,
          );
          const hasAnyError =
            mandatoryDocsError ||
            mandatoryQuestionnairesError ||
            mandatoryCareTeamError ||
            mandatoryDiagnosisError ||
            mandatoryChargeItemsError ||
            mandatoryProcedureError ||
            mandatorySupportingInfoError ||
            amountCapError ||
            conditionErrors;
          return (
            <Card
              className={cn(hasAnyError && "overflow-hidden border-red-500")}
            >
              <CardHeader>
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`item.${index}.product_or_service`}
                  render={({ field }) => {
                    const isProductLocked = !!field.value?.code;
                    return (
                      <div className="flex justify-between items-center gap-2">
                        <FormItem className="space-y-1.5 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <FormLabel>
                              Product or Service
                              <span className="text-red-500 text-sm ml-0.5">
                                *
                              </span>
                            </FormLabel>
                            {isQueriedItem && (
                              <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium">
                                Queried
                              </Badge>
                            )}
                          </div>
                          <FormControl>
                            <BenefitSearchSelect
                              insurancePlanId={planId}
                              value={field.value}
                              onSelect={(benefit) => {
                                form.setValue(
                                  `item.${index}.product_or_service`,
                                  {
                                    system: PROCEDURE_CODE_SYSTEM,
                                    code: benefit.type_code,
                                    display: benefit.type_display,
                                  }, USER_EDIT);
                                form.setValue(`item.${index}.category`, {
                                  system: BENEFIT_CATEGORY_SYSTEM,
                                  code: benefit.coverage_type_code,
                                  display: benefit.coverage_type_display,
                                }, USER_EDIT);
                                const existing =
                                  form.getValues(
                                    `item.${index}.program_code`,
                                  ) ?? [];
                                if (
                                  !existing.find((c) => c.code === "AB-PMJAY")
                                ) {
                                  form.setValue(`item.${index}.program_code`, [
                                    ...existing,
                                    AB_PMJAY_CODE,
                                  ], USER_EDIT);
                                }
                              }}
                              disabled={isProductLocked}
                            />
                          </FormControl>
                          {isProductLocked && (
                            <p className="text-xs text-muted-foreground">
                              Product is locked. Remove this item and add a new
                              one to change it.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemWithCleanup(index)}
                          className="mt-6"
                        >
                          <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                        </Button>
                      </div>
                    );
                  }}
                />
              </CardHeader>
              {isQueriedItem && itemQueryReasons.length > 0 && (
                <div className="px-6 pb-2">
                  <Alert className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                    <MessageCircleQuestionIcon />
                    <AlertDescription className="text-amber-900">
                      <p className="font-medium text-amber-950 mb-1">
                        Payer query reason
                      </p>
                      {itemQueryReasons.length > 1 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-sm">
                          {itemQueryReasons.map((reason, reasonIndex) => (
                            <li key={reasonIndex}>{reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm">{itemQueryReasons[0]}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <CardContent className="space-y-4">
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`item.${index}.category`}
                  render={({ field }) => {
                    const hasProduct = Boolean(
                      form.watch(`item.${index}.product_or_service`)?.code,
                    );
                    return (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <ValuesetSelect
                            system="system-claim-item-category"
                            value={field.value}
                            onSelect={(value) => {
                              form.setValue(`item.${index}.category`, value, USER_EDIT);
                            }}
                            disabled={hasProduct}
                          />
                        </FormControl>
                        {hasProduct && (
                          <p className="text-xs text-muted-foreground">
                            Auto-set from selected benefit
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  key={field.id}
                  control={form.control}
                  name={`item.${index}.program_code`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Program Code</FormLabel>
                      <FormControl>
                        <div className="grid gap-4">
                          <Autocomplete
                            options={PROGRAM_CODES.map((code) => ({
                              label: code.display,
                              value: code.code,
                            }))}
                            value={undefined}
                            onChange={(value) => {
                              const code = PROGRAM_CODES.find(
                                (code) => code.code === value,
                              );
                              if (!code) {
                                return;
                              }
                              form.setValue(
                                `item.${index}.program_code`,
                                field.value
                                  .map((c) => c.code)
                                  .includes(code.code)
                                  ? field.value
                                  : [...field.value, code], USER_EDIT);
                            }}
                          />

                          <div className="flex flex-wrap gap-2">
                            {field.value.map((code) => (
                              <Badge key={code.code} className="flex gap-2">
                                {code.display}
                                <XIcon
                                  className="w-4 h-4 cursor-pointer"
                                  onClick={() => {
                                    form.setValue(
                                      `item.${index}.program_code`,
                                      field.value.filter(
                                        (c) => c.code !== code.code,
                                      ), USER_EDIT);
                                  }}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ModifierField form={form} index={index} planId={planId} />

                <AddChargeItemsSection
                  form={form}
                  index={index}
                  encounterChargeItems={encounterChargeItems}
                />

                <FormField
                  control={form.control}
                  name={`item.${index}.diagnosis_sequence`}
                  render={() => (
                    <FormItem>
                      <AddDiagnosisSection form={form} index={index} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <AddProcedureSection form={form} index={index} />
                <FormField
                  control={form.control}
                  name={`item.${index}.care_team_sequence`}
                  render={() => (
                    <FormItem>
                      <AddCareTeamSection form={form} index={index} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <AddSupportingInfoSection
                  form={form}
                  index={index}
                  planId={planId}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  claimUse={claimUse}
                />
                <AddQuestionnaireSection
                  form={form}
                  index={index}
                  planId={planId}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  claimUse={claimUse}
                />

                <ItemValidationEffects
                  form={form}
                  index={index}
                  planId={planId}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  previousClaim={previousClaim}
                  encounterChargeItems={encounterChargeItems}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`item.${index}.serviced_period.start`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Service Period Start
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={
                              field.value ? new Date(field.value) : undefined
                            }
                            onChange={(value) => {
                              form.setValue(
                                `item.${index}.serviced_period.start`,
                                value ? value.toISOString() : "", USER_EDIT);
                            }}
                            placeholder="Select start date and time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`item.${index}.serviced_period.end`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Service Period End
                          {claimUse === "claim" && (
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={
                              field.value ? new Date(field.value) : undefined
                            }
                            onChange={(value) => {
                              form.setValue(
                                `item.${index}.serviced_period.end`,
                                value ? value.toISOString() : undefined, USER_EDIT);
                            }}
                            placeholder="Select end date and time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`item.${index}.quantity.value`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Quantity Value
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value || ""}
                            onChange={(e) => {
                              form.setValue(
                                `item.${index}.quantity.value`,
                                e.target.value ? parseFloat(e.target.value) : 0, USER_EDIT);
                            }}
                            placeholder="Enter quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`item.${index}.quantity.unit`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Quantity Unit</FormLabel>
                        <FormControl>
                          <ValuesetSelect
                            system="system-ucum-units"
                            value={field.value}
                            onSelect={(value) => {
                              form.setValue(
                                `item.${index}.quantity.unit`,
                                value, USER_EDIT);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`item.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Unit Price
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/40 text-sm font-medium">
                            <span className="text-muted-foreground">₹</span>
                            <span>{(field.value ?? 0).toFixed(2)}</span>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Auto-calculated from selected charge items (capped at
                          benefit limit)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`item.${index}.factor`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Factor</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value || ""}
                            onChange={(e) => {
                              form.setValue(
                                `item.${index}.factor`,
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined, USER_EDIT);
                            }}
                            placeholder="Enter factor"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <ItemAmountReferences
                  form={form}
                  index={index}
                  planId={planId}
                  coverageEligibilityRequest={coverageEligibilityRequest}
                  previousClaim={previousClaim}
                />
              </CardContent>
              {hasAnyError && (
                <CardFooter className="rounded-b-xl px-6 py-3 border-t border-red-200 bg-red-50 flex-col items-start gap-2">
                  {mandatoryDocsError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryDocsError}
                    </div>
                  )}
                  {mandatoryQuestionnairesError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryQuestionnairesError}
                    </div>
                  )}
                  {mandatoryCareTeamError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryCareTeamError}
                    </div>
                  )}
                  {mandatoryDiagnosisError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryDiagnosisError}
                    </div>
                  )}
                  {mandatoryChargeItemsError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryChargeItemsError}
                    </div>
                  )}
                  {mandatoryProcedureError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatoryProcedureError}
                    </div>
                  )}
                  {mandatorySupportingInfoError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {mandatorySupportingInfoError}
                    </div>
                  )}
                  {amountCapError && (
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                      {amountCapError}
                    </div>
                  )}
                  {conditionErrors &&
                    conditionErrors.split(" • ").map((err, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm font-medium text-red-600"
                      >
                        <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                        {err}
                      </div>
                    ))}
                </CardFooter>
              )}
            </Card>
          );
        })}

        <FormField
          control={form.control}
          name="item"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function ModifierField({
  form,
  index,
  planId,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;

  const { data: benefitDetail, isLoading } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  const qualifiers = useMemo<Coding[]>(() => {
    if (!benefitDetail?.costs) return [];
    const seen = new Set<string>();
    const result: Coding[] = [];
    for (const cost of benefitDetail.costs) {
      for (const q of cost.qualifiers) {
        if (!seen.has(q.qualifier_code)) {
          seen.add(q.qualifier_code);
          result.push({
            system: q.qualifier.coding?.[0]?.system ?? "",
            code: q.qualifier_code,
            display: q.qualifier.text ?? q.qualifier.coding?.[0]?.display,
          });
        }
      }
    }
    return result;
  }, [benefitDetail]);

  const qualifierTypeByCode = useMemo(
    () => getQualifierTypeByCode(benefitDetail),
    [benefitDetail],
  );

  // Implant modifiers are auto-filled and locked: they cannot be added or
  // removed by the user. Only non-implant qualifiers are user-selectable.
  const selectableQualifiers = useMemo(
    () =>
      qualifiers.filter((q) => qualifierTypeByCode.get(q.code) !== "implant"),
    [qualifiers, qualifierTypeByCode],
  );

  // Auto-fill modifiers from the benefit qualifiers when the form field is
  // empty. This covers prefill paths that didn't carry modifiers through
  // (e.g. older CE/Claim records). Only fires once per (item, benefit) load,
  // so user removals are preserved.
  const didAutofillRef = useRef(false);
  useEffect(() => {
    if (didAutofillRef.current) return;
    if (!productCode || qualifiers.length === 0) return;
    const current = form.getValues(`item.${index}.modifier`) ?? [];
    if (current.length > 0) {
      didAutofillRef.current = true;
      return;
    }
    form.setValue(`item.${index}.modifier`, qualifiers, { shouldDirty: false });
    didAutofillRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCode, qualifiers]);

  return (
    <FormField
      control={form.control}
      name={`item.${index}.modifier`}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>
            Modifier
            {isModifierRequired(benefitDetail) && (
              <span className="text-red-500 text-sm ml-0.5">*</span>
            )}
          </FormLabel>
          <FormControl>
            <div className="grid gap-4">
              <Autocomplete
                options={selectableQualifiers.map((q) => ({
                  label: q.display ? `${q.code} - ${q.display}` : q.code,
                  value: q.code,
                }))}
                value={undefined}
                onChange={(code) => {
                  const qualifier = selectableQualifiers.find(
                    (q) => q.code === code,
                  );
                  if (!qualifier) return;
                  const existing = field.value ?? [];
                  if (existing.some((c) => c.code === qualifier.code)) return;
                  form.setValue(`item.${index}.modifier`, [
                    ...existing,
                    qualifier,
                  ], USER_EDIT);
                }}
                disabled={!productCode || isLoading}
                placeholder={
                  !productCode
                    ? "Select a benefit first"
                    : isLoading
                      ? "Loading qualifiers…"
                      : selectableQualifiers.length === 0
                        ? "No qualifiers available"
                        : "Select a modifier"
                }
                noOptionsMessage={
                  !productCode
                    ? "Select a benefit first"
                    : "No qualifiers available"
                }
              />
              <div className="flex flex-wrap gap-2">
                {(field.value ?? []).map((code) => {
                  const isImplant =
                    qualifierTypeByCode.get(code.code) === "implant";
                  return (
                    <Badge key={code.code} className="flex gap-2">
                      <span className="font-mono">{code.code}</span>
                      {code.display && (
                        <span className="opacity-80"> - {code.display}</span>
                      )}
                      {!isImplant && (
                        <XIcon
                          className="w-4 h-4 cursor-pointer"
                          onClick={() => {
                            form.setValue(
                              `item.${index}.modifier`,
                              field.value.filter((c) => c.code !== code.code), USER_EDIT);
                          }}
                        />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AddChargeItemsSection({
  form,
  index,
  encounterChargeItems = [],
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  encounterChargeItems?: ChargeItem[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rawSelectedIds = form.watch(`item.${index}.charge_items`);
  const rawAllItems = form.watch("item");

  const selectedIds = useMemo(
    () => rawSelectedIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawSelectedIds)],
  );

  const allItems = useMemo(
    () => rawAllItems ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawAllItems?.map((i) => i.charge_items))],
  );

  const takenByOthers = useMemo(
    () =>
      new Set(
        allItems.flatMap((item, i) =>
          i !== index ? (item.charge_items ?? []) : [],
        ),
      ),
    [allItems, index],
  );

  const selectedChargeItems = useMemo(
    () =>
      selectedIds
        .map((id) => encounterChargeItems.find((ci) => ci.id === id))
        .filter((ci): ci is ChargeItem => !!ci),
    [selectedIds, encounterChargeItems],
  );

  const availableToAdd = useMemo(
    () =>
      encounterChargeItems.filter(
        (ci) => !selectedIds.includes(ci.id) && !takenByOthers.has(ci.id),
      ),
    [encounterChargeItems, selectedIds, takenByOthers],
  );

  const totalSelected = useMemo(
    () =>
      selectedChargeItems.reduce(
        (sum, ci) => sum + parseFloat(ci.total_price || "0"),
        0,
      ),
    [selectedChargeItems],
  );

  const hasMissingChargeItems = selectedIds.length === 0;

  const {
    field: mandatoryChargeItemsField,
    fieldState: mandatoryChargeItemsFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_charge_items_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = hasMissingChargeItems
      ? encounterChargeItems.length === 0
        ? "No charge items are available for this encounter. At least one charge item is required."
        : "At least one charge item is required"
      : undefined;
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_charge_items_error`,
      nextError,
    );
  }, [form, index, encounterChargeItems.length, hasMissingChargeItems]);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasMissingChargeItems && sectionErrorBorderClass,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <ReceiptIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            Charge Items
            <span className="text-red-500 text-sm ml-0.5">*</span>
          </span>
          {!hasMissingChargeItems && selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length}
            </Badge>
          )}
          {hasMissingChargeItems && (
            <Badge variant="destructive" className="ml-1 text-xs">
              1 required
            </Badge>
          )}
        </div>
        {selectedIds.length > 0 && !isExpanded && (
          <span className="text-sm text-muted-foreground">
            ₹{totalSelected.toFixed(2)}
          </span>
        )}
      </div>

      {(mandatoryChargeItemsFieldState.error?.message ||
        mandatoryChargeItemsField.value) && (
        <p className="text-sm font-medium text-red-600 px-1">
          {mandatoryChargeItemsFieldState.error?.message ||
            mandatoryChargeItemsField.value}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-3 pl-4">
          {encounterChargeItems.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground flex items-start gap-2">
              <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <span>
                No charge items are linked to this encounter yet. Add charge
                items to the encounter before submitting the claim.
              </span>
            </div>
          ) : (
            <>
              <Autocomplete
                options={availableToAdd.map((ci) => ({
                  label: `${chargeItemLabel(ci)}${ci.code?.code ? ` (${ci.code.code})` : ""} — ₹${parseFloat(ci.total_price || "0").toFixed(2)}`,
                  value: ci.id,
                }))}
                value={undefined}
                onChange={(id) => {
                  if (!selectedIds.includes(id)) {
                    form.setValue(`item.${index}.charge_items`, [
                      ...selectedIds,
                      id,
                    ], USER_EDIT);
                  }
                }}
                placeholder={
                  availableToAdd.length === 0
                    ? "No charge items available"
                    : "Search and select a charge item…"
                }
                noOptionsMessage="No charge items available"
              />

              {selectedChargeItems.length > 0 && (
                <div className="space-y-2">
                  {selectedChargeItems.map((ci) => (
                    <div
                      key={ci.id}
                      className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chargeItemLabel(ci)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ci.code?.code && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {ci.code.code}
                            </span>
                          )}
                          <span className="text-xs font-medium text-foreground">
                            ₹{parseFloat(ci.total_price || "0").toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-7 w-7"
                        onClick={() => {
                          form.setValue(
                            `item.${index}.charge_items`,
                            selectedIds.filter((id) => id !== ci.id), USER_EDIT);
                        }}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {selectedChargeItems.length > 1 && (
                    <div className="flex justify-end text-sm text-muted-foreground px-1">
                      Total: ₹{totalSelected.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {selectedIds.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">
                  No charge items selected. Select charge items to
                  auto-calculate the unit price.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Looks up the CE:AR (auth-requirements) response and returns the payer's
 * `allowed_amount` for the given procedure code. Reference-only: exceeding it
 * surfaces a warning but does not block submit.
 */
function getCeAllowedAmount(
  coverageEligibilityRequest: CoverageEligibilityRequest | undefined,
  productCode: string | undefined,
): number | null {
  if (!productCode) return null;
  const insurances = coverageEligibilityRequest?.latest_response?.insurances;
  if (!insurances) return null;
  const allItems = insurances.flatMap((ins) => ins.items ?? []);
  const matched =
    allItems.find((item) => item.code === productCode) ??
    (allItems.length === 1 ? allItems[0] : undefined);
  return matched?.allowed_amount?.value ?? null;
}

/**
 * Looks up the pre-auth response adjudication for the given item sequence and
 * returns the payer-approved amount. Reference-only.
 */
function getPreAuthApprovedAmount(
  previousClaim: Claim | undefined,
  itemSequence: number | undefined,
): number | null {
  if (itemSequence == null) return null;
  const responseItems = previousClaim?.latest_response?.item;
  if (!responseItems) return null;
  const matched = responseItems.find((ri) => ri.itemSequence === itemSequence);
  if (!matched?.adjudication) return null;
  const benefitAdj = matched.adjudication.find((adj) =>
    adj.category?.coding?.some((c) =>
      ["benefit", "approved", "eligible"].includes(c.code ?? ""),
    ),
  );
  return benefitAdj?.amount?.value ?? null;
}

/**
 * Pure-side-effect component: watches item fields and sets virtual error fields
 * `_amount_cap_error` and `_condition_errors` in real time so errors are visible
 * before the user clicks submit. The hard cap is the benefit limit only —
 * payer-driven reference amounts (CE:AR allowed / pre-auth approved) are shown
 * separately as warnings via `ItemAmountReferences`.
 */
function ItemValidationEffects({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  previousClaim,
  encounterChargeItems = [],
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  encounterChargeItems?: ChargeItem[];
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const quantityValue = form.watch(`item.${index}.quantity.value`);
  const rawModifiers = form.watch(`item.${index}.modifier`);
  const rawChargeItemIds = form.watch(`item.${index}.charge_items`);

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)],
  );

  const chargeItemIds = useMemo(
    () => rawChargeItemIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawChargeItemIds)],
  );

  // Loads benefit (same query key as ModifierField → cached, no extra request)
  const { data: benefitDetail } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  // Benefit limit is the only hard cap.
  const benefitLimit = useMemo(() => {
    if (!benefitDetail) return null;
    return computeBenefitLimit(
      benefitDetail,
      modifiers.map((m) => m.code),
    );
  }, [benefitDetail, modifiers]);

  // Build a price lookup keyed by charge-item id from every available source.
  // The encounter charge-item query can resolve after the form is prefilled,
  // and the prefilled ids originate from the charge items embedded in the CE
  // request / previous claim — both of which already carry `total_price`. Using
  // all sources keeps the auto-calculated unit price correct on initial load
  // instead of momentarily falling back to 0 until the user edits the items.
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
    (previousClaim?.item ?? []).forEach((it) =>
      addChargeItems(it.charge_items),
    );
    return priceById;
  }, [encounterChargeItems, coverageEligibilityRequest, previousClaim]);

  // Sum total prices of all selected charge items.
  //
  // The selected ids are read via `getValues` (the authoritative current form
  // state) rather than the watched value: right after a bulk prefill,
  // `form.watch` for a freshly-`reset` nested array can lag behind the actual
  // form values, which previously left this total — and therefore the
  // auto-calculated unit price — at 0 until the user edited the charge items.
  // The watched ids are still kept in the dependency list so the total
  // recomputes whenever the user adds/removes a charge item.
  const chargeItemsTotal = useMemo(() => {
    const ids = form.getValues(`item.${index}.charge_items`) ?? chargeItemIds;
    return ids.reduce((sum, id) => sum + (chargeItemPriceById.get(id) ?? 0), 0);
  }, [chargeItemIds, chargeItemPriceById, form, index]);

  useEffect(() => {
    const capped =
      benefitLimit != null
        ? Math.min(chargeItemsTotal, benefitLimit)
        : chargeItemsTotal;
    form.setValue(`item.${index}.unit_price`, capped, { shouldDirty: false });

    if (benefitLimit != null && chargeItemsTotal > benefitLimit) {
      form.setValue(
        `item.${index}._amount_cap_error`,
        `The amount requested is ₹${chargeItemsTotal.toFixed(2)}, but the expected amount is ₹${benefitLimit.toFixed(2)}. The amount has been adjusted to the expected limit — please inform the patient.`,
        { shouldDirty: false, shouldValidate: true },
      );
    } else {
      form.setValue(`item.${index}._amount_cap_error`, undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [chargeItemsTotal, benefitLimit, form, index]);

  useEffect(() => {
    const errors = buildBenefitConditionErrors(
      benefitDetail,
      Number(quantityValue),
      modifiers,
    );
    const nextError = errors.length > 0 ? errors.join(" • ") : undefined;
    const currentError = form.getValues(`item.${index}._condition_errors`);

    if (currentError !== nextError) {
      form.setValue(`item.${index}._condition_errors`, nextError, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [benefitDetail, quantityValue, modifiers, form, index]);

  return null;
}

/**
 * Inline panel rendered next to the unit price field. Shows the benefit limit
 * (hard cap) alongside payer-driven reference amounts: CE:AR allowed amount
 * and pre-auth approved amount. Emits a non-blocking warning when the current
 * unit price exceeds either payer reference.
 */
function ItemAmountReferences({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  previousClaim,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const itemSequence = form.watch(`item.${index}.sequence`);
  const unitPrice = form.watch(`item.${index}.unit_price`) ?? 0;
  const rawModifiers = form.watch(`item.${index}.modifier`);

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)],
  );

  const { data: benefitDetail } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  const benefitLimit = useMemo(() => {
    if (!benefitDetail) return null;
    return computeBenefitLimit(
      benefitDetail,
      modifiers.map((m) => m.code),
    );
  }, [benefitDetail, modifiers]);

  const ceAllowed = useMemo(
    () => getCeAllowedAmount(coverageEligibilityRequest, productCode),
    [coverageEligibilityRequest, productCode],
  );
  const preAuthApproved = useMemo(
    () => getPreAuthApprovedAmount(previousClaim, itemSequence),
    [previousClaim, itemSequence],
  );

  const refs: Array<{ label: string; value: number; warn?: boolean }> = [];
  if (benefitLimit != null) {
    refs.push({ label: "Benefit limit (hard cap)", value: benefitLimit });
  }
  if (ceAllowed != null) {
    refs.push({
      label: "Coverage eligibility allowed amount",
      value: ceAllowed,
      warn: unitPrice > ceAllowed,
    });
  }
  if (preAuthApproved != null) {
    refs.push({
      label: "Pre-Authorization approved amount",
      value: preAuthApproved,
      warn: unitPrice > preAuthApproved,
    });
  }

  if (refs.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Amount references
      </p>
      <div className="space-y-1">
        {refs.map((ref) => (
          <div
            key={ref.label}
            className="flex items-center justify-between text-xs"
          >
            <span
              className={cn(
                "text-muted-foreground",
                ref.warn && "text-amber-700 font-medium",
              )}
            >
              {ref.label}
            </span>
            <span
              className={cn(
                "font-medium",
                ref.warn ? "text-amber-700" : "text-foreground",
              )}
            >
              ₹{ref.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      {refs.some((r) => r.warn) && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 pt-1 border-t border-amber-200">
          <AlertCircleIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Unit price exceeds the payer's prior reference amount. Submission is
            still allowed within the benefit limit, but the payer may adjust
            this down.
          </span>
        </div>
      )}
    </div>
  );
}

function AddDiagnosisSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const diagnosisFields = form.watch("diagnosis") || [];
  const itemDiagnosisSequences =
    form.watch(`item.${index}.diagnosis_sequence`) || [];
  const itemSpecificDiagnoses = diagnosisFields.filter((diagnosis) =>
    itemDiagnosisSequences.includes(diagnosis.sequence),
  );
  const diagnosisValidation = getCardSectionValidationCounts(
    itemSpecificDiagnoses,
    getClaimDiagnosisCardError,
    { minRequired: 1 },
  );
  const hasSectionError = hasSectionValidationIssue(diagnosisValidation);

  const {
    field: mandatoryDiagnosisField,
    fieldState: mandatoryDiagnosisFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_diagnosis_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      diagnosisValidation,
      "diagnosis",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_diagnosis_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    diagnosisValidation.requiredMissing,
    diagnosisValidation.incomplete,
    itemSpecificDiagnoses.length,
  ]);

  const addNewDiagnosis = () => {
    const currentDiagnoses = form.getValues("diagnosis") || [];
    const newSequence =
      Math.max(0, ...currentDiagnoses.map((d) => d.sequence)) + 1;
    const newDiagnosis = {
      sequence: newSequence,
      type: [],
      diagnosis_reference: undefined,
      diagnosis_code: undefined,
      on_admission: undefined,
    };

    form.setValue("diagnosis", [...currentDiagnoses, newDiagnosis], USER_EDIT);

    const currentSequences =
      form.getValues(`item.${index}.diagnosis_sequence`) || [];
    form.setValue(`item.${index}.diagnosis_sequence`, [
      ...currentSequences,
      newSequence,
    ], USER_EDIT);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">
            Diagnoses
            <span className="text-red-500 text-sm ml-0.5">*</span>
          </span>
          {!hasSectionError && itemSpecificDiagnoses.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificDiagnoses.length}
            </Badge>
          )}
          <SectionValidationBadges counts={diagnosisValidation} />
        </div>
      </div>

      {(mandatoryDiagnosisFieldState.error?.message ||
        mandatoryDiagnosisField.value) && (
        <SectionErrorMessage
          message={
            mandatoryDiagnosisFieldState.error?.message ||
            (mandatoryDiagnosisField.value as string)
          }
        />
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificDiagnoses.map((diagnosis, diagnosisIndex) => {
            const mainDiagnosisIndex = diagnosisFields.findIndex(
              (d) => d.sequence === diagnosis.sequence,
            );
            const cardError = getClaimDiagnosisCardError(diagnosis);
            return (
              <Card
                key={diagnosisIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`diagnosis.${mainDiagnosisIndex}.diagnosis_code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Diagnosis Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-diagnosis-code"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.diagnosis_code`,
                                  value, USER_EDIT);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`diagnosis.${mainDiagnosisIndex}.on_admission`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>On Admission</FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={[
                                { label: "Yes", value: "yes" },
                                { label: "No", value: "no" },
                                { label: "Unknown", value: "unknown" },
                              ]}
                              value={field.value}
                              onChange={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.on_admission`,
                                  value as "yes" | "no" | "unknown" | undefined, USER_EDIT);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentDiagnoses =
                          form.getValues("diagnosis") || [];
                        const updatedDiagnoses = currentDiagnoses.filter(
                          (_, i) => i !== mainDiagnosisIndex,
                        );
                        form.setValue("diagnosis", updatedDiagnoses, USER_EDIT);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.diagnosis_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== diagnosis.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.diagnosis_sequence`,
                            updatedSequences, USER_EDIT);
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`diagnosis.${mainDiagnosisIndex}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Type
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="grid gap-4">
                            <ValuesetSelect
                              system="system-claim-diagnosis-type"
                              value={undefined}
                              onSelect={(value) => {
                                form.setValue(
                                  `diagnosis.${mainDiagnosisIndex}.type`,
                                  field.value
                                    .map((c) => c.code)
                                    .includes(value.code)
                                    ? field.value
                                    : [...field.value, value], USER_EDIT);
                              }}
                            />

                            <div className="flex flex-wrap gap-2">
                              {field.value.map((code) => (
                                <Badge key={code.code} className="flex gap-2">
                                  {code.display}
                                  <XIcon
                                    className="w-4 h-4 cursor-pointer"
                                    onClick={() => {
                                      form.setValue(
                                        `diagnosis.${mainDiagnosisIndex}.type`,
                                        field.value.filter(
                                          (c) => c.code !== code.code,
                                        ), USER_EDIT);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                {cardError && <FormCardErrorFooter message={cardError} />}
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewDiagnosis}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Diagnosis
          </Button>
        </div>
      )}
    </div>
  );
}

function AddProcedureSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const procedureFields = form.watch("procedure") || [];
  const itemProcedureSequences =
    form.watch(`item.${index}.procedure_sequence`) || [];
  const itemSpecificProcedures = procedureFields.filter((procedure) =>
    itemProcedureSequences.includes(procedure.sequence),
  );
  const procedureValidation = getCardSectionValidationCounts(
    itemSpecificProcedures,
    getClaimProcedureCardError,
  );
  const hasSectionError = hasSectionValidationIssue(procedureValidation);

  const {
    field: mandatoryProcedureField,
    fieldState: mandatoryProcedureFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_procedure_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      procedureValidation,
      "procedure",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_procedure_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    procedureValidation.incomplete,
    itemSpecificProcedures.length,
  ]);

  const sectionErrorMessage =
    mandatoryProcedureFieldState.error?.message ||
    (mandatoryProcedureField.value as string | undefined);

  const addNewProcedure = () => {
    const currentProcedures = form.getValues("procedure") || [];
    const newSequence =
      Math.max(0, ...currentProcedures.map((p) => p.sequence)) + 1;
    const newProcedure = {
      sequence: newSequence,
      type: [],
      date: undefined,
      procedure_reference: undefined,
      procedure_code: undefined,
    };

    form.setValue("procedure", [...currentProcedures, newProcedure], USER_EDIT);

    const currentSequences =
      form.getValues(`item.${index}.procedure_sequence`) || [];
    form.setValue(`item.${index}.procedure_sequence`, [
      ...currentSequences,
      newSequence,
    ], USER_EDIT);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Procedures</span>
          {!hasSectionError && itemSpecificProcedures.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificProcedures.length}
            </Badge>
          )}
          <SectionValidationBadges counts={procedureValidation} />
        </div>
      </div>

      <SectionErrorMessage message={sectionErrorMessage} />

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificProcedures.map((procedure, procedureIndex) => {
            const mainProcedureIndex = procedureFields.findIndex(
              (p) => p.sequence === procedure.sequence,
            );
            const cardError = getClaimProcedureCardError(procedure);
            return (
              <Card
                key={procedureIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`procedure.${mainProcedureIndex}.procedure_code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Procedure Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-procedure-code"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.procedure_code`,
                                  value, USER_EDIT);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`procedure.${mainProcedureIndex}.date`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.date`,
                                  value ? value.toISOString() : undefined, USER_EDIT);
                              }}
                              placeholder="Select date and time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentProcedures =
                          form.getValues("procedure") || [];
                        const updatedProcedures = currentProcedures.filter(
                          (_, i) => i !== mainProcedureIndex,
                        );
                        form.setValue("procedure", updatedProcedures, USER_EDIT);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.procedure_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== procedure.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.procedure_sequence`,
                            updatedSequences, USER_EDIT);
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name={`procedure.${mainProcedureIndex}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <div className="grid gap-4">
                            <ValuesetSelect
                              system="system-claim-procedure-type"
                              value={undefined}
                              onSelect={(value) => {
                                form.setValue(
                                  `procedure.${mainProcedureIndex}.type`,
                                  field.value
                                    .map((c) => c.code)
                                    .includes(value.code)
                                    ? field.value
                                    : [...field.value, value], USER_EDIT);
                              }}
                            />

                            <div className="flex flex-wrap gap-2">
                              {field.value.map((code) => (
                                <Badge key={code.code} className="flex gap-2">
                                  {code.display}
                                  <XIcon
                                    className="w-4 h-4 cursor-pointer"
                                    onClick={() => {
                                      form.setValue(
                                        `procedure.${mainProcedureIndex}.type`,
                                        field.value.filter(
                                          (c) => c.code !== code.code,
                                        ), USER_EDIT);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                {cardError && <FormCardErrorFooter message={cardError} />}
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewProcedure}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Procedure
          </Button>
        </div>
      )}
    </div>
  );
}

function AddCareTeamSection({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const careTeamFields = form.watch("care_team") || [];
  const itemCareTeamSequences =
    form.watch(`item.${index}.care_team_sequence`) || [];

  const itemSpecificCareTeam = careTeamFields.filter((member) =>
    itemCareTeamSequences.includes(member.sequence),
  );
  const careTeamValidation = getCardSectionValidationCounts(
    itemSpecificCareTeam,
    getClaimCareTeamCardError,
    { minRequired: 1 },
  );
  const hasSectionError = hasSectionValidationIssue(careTeamValidation);

  const {
    field: mandatoryCareTeamField,
    fieldState: mandatoryCareTeamFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_care_team_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      careTeamValidation,
      "care team member",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_care_team_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    careTeamValidation.requiredMissing,
    careTeamValidation.incomplete,
    itemSpecificCareTeam.length,
  ]);

  const facilityId = form.getValues("facility");
  const { data: usersResponse, isLoading: loading } = useQuery({
    queryKey: ["facility-users", facilityId],
    queryFn: () => apis.user.facilityUsers(facilityId),
    enabled: isExpanded && !!facilityId,
  });

  const users = usersResponse?.results || [];

  const addNewCareTeamMember = () => {
    // Read the current care team directly from the form store (always
    // up-to-date) instead of relying on useFieldArray's local snapshot, which
    // can be stale when multiple AddCareTeamSection instances are mounted for
    // different items and would cause duplicate sequence numbers.
    const currentCareTeam = form.getValues("care_team") || [];
    const newSequence =
      Math.max(0, ...currentCareTeam.map((m) => m.sequence)) + 1;
    const newCareTeamMember = {
      sequence: newSequence,
      provider: "",
      responsible: false,
      role: undefined,
    };

    form.setValue("care_team", [...currentCareTeam, newCareTeamMember], USER_EDIT);

    const currentSequences =
      form.getValues(`item.${index}.care_team_sequence`) || [];
    form.setValue(`item.${index}.care_team_sequence`, [
      ...currentSequences,
      newSequence,
    ], USER_EDIT);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
        )}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">
            Care Team
            <span className="text-red-500 text-sm ml-0.5">*</span>
          </span>
          {!hasSectionError && itemSpecificCareTeam.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificCareTeam.length}
            </Badge>
          )}
          <SectionValidationBadges counts={careTeamValidation} />
        </div>
      </div>

      {(mandatoryCareTeamFieldState.error?.message ||
        mandatoryCareTeamField.value) && (
        <SectionErrorMessage
          message={
            mandatoryCareTeamFieldState.error?.message ||
            (mandatoryCareTeamField.value as string)
          }
        />
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {loading && <InlineLoading label="Loading facility users…" />}

          {itemSpecificCareTeam.map((member, memberIndex) => {
            const mainMemberIndex = careTeamFields.findIndex(
              (m) => m.sequence === member.sequence,
            );
            const cardError = getClaimCareTeamCardError(member);
            return (
              <Card
                key={memberIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.provider`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Provider
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Autocomplete
                              options={users.map((user) => ({
                                label: `${user.first_name} ${user.last_name}`,
                                value: user.id,
                              }))}
                              value={field.value}
                              onChange={(value) => {
                                form.setValue(
                                  `care_team.${mainMemberIndex}.provider`,
                                  value, USER_EDIT);
                              }}
                              placeholder="Select a provider"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentCareTeam =
                          form.getValues("care_team") || [];
                        const updatedCareTeam = currentCareTeam.filter(
                          (_, i) => i !== mainMemberIndex,
                        );
                        form.setValue("care_team", updatedCareTeam, USER_EDIT);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.care_team_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== member.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.care_team_sequence`,
                            updatedSequences, USER_EDIT);
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.role`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <ValuesetSelect
                              system="system-claim-care-team-role"
                              value={field.value}
                              onSelect={(value) => {
                                form.setValue(
                                  `care_team.${mainMemberIndex}.role`,
                                  value, USER_EDIT);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`care_team.${mainMemberIndex}.responsible`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Responsible</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2 h-9">
                              <Checkbox
                                id={`responsible-${mainMemberIndex}`}
                                checked={field.value || false}
                                onCheckedChange={(checked) => {
                                  form.setValue(
                                    `care_team.${mainMemberIndex}.responsible`,
                                    checked as boolean, USER_EDIT);
                                }}
                              />
                              <Label
                                htmlFor={`responsible-${mainMemberIndex}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                This provider is responsible for the care
                              </Label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                {cardError && <FormCardErrorFooter message={cardError} />}
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewCareTeamMember}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Care Team Member
          </Button>
        </div>
      )}
    </div>
  );
}

function AddSupportingInfoSection({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  claimUse,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  /**
   * When provided alongside `claimUse === "preauthorization"`, the IPB benefit
   * requirements are filtered down to the strict intersection with the CE
   * response's required documents for this item's procedure code. For
   * `claimUse === "claim"` (or when no CE request is available) all benefit
   * requirements are shown unfiltered.
   */
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  claimUse: ClaimUseChoice | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const didAutoExpandRef = useRef(false);
  const supportingInfoFields = form.watch("supporting_info") || [];
  const itemSupportingInfoSequences =
    form.watch(`item.${index}.information_sequence`) || [];
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;

  const { data: benefitDetail } = useQuery({
    queryKey: ["insurancePlanBenefit", "lookup", planId, productCode],
    queryFn: () =>
      apis.insurancePlanBenefit.lookup({
        insurance_plan: planId!,
        type_code: productCode!,
      }),
    enabled: Boolean(planId && productCode),
    staleTime: 5 * 60 * 1000,
  });

  const ceDocCodesForItem = useMemo(() => {
    if (claimUse !== "preauthorization") return null;
    if (!coverageEligibilityRequest || !productCode) return null;
    const allItems =
      coverageEligibilityRequest.latest_response?.insurances?.flatMap(
        (i) => i.items ?? [],
      ) ?? [];
    const matchedItem = allItems.find((item) => item.code === productCode);
    if (!matchedItem) return new Set<string>();
    return new Set(matchedItem.required_documents.map((d) => d.code));
  }, [coverageEligibilityRequest, claimUse, productCode]);

  const allSupportingInfoRequirements = useMemo(() => {
    const all = benefitDetail?.supporting_info_requirements ?? [];
    const docReqs = all.filter((req) => !req.documentation_url);
    const filtered = ceDocCodesForItem
      ? docReqs.filter((req) => ceDocCodesForItem.has(req.code_code))
      : docReqs;
    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = `${req.category_code}:${req.code_code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [benefitDetail, ceDocCodesForItem]);

  const requiredRequirements = useMemo(
    () => allSupportingInfoRequirements.filter((req) => req.is_required),
    [allSupportingInfoRequirements],
  );

  const recommendedRequirements = useMemo(
    () => allSupportingInfoRequirements.filter((req) => !req.is_required),
    [allSupportingInfoRequirements],
  );

  const itemSpecificSupportingInfo = supportingInfoFields.filter((info) =>
    itemSupportingInfoSequences.includes(info.sequence),
  );

  useEffect(() => {
    if (itemSpecificSupportingInfo.length > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setIsExpanded(true);
    }
  }, [itemSpecificSupportingInfo.length]);

  type RequirementStatus = "satisfied" | "incomplete" | "missing";

  const getRequirementStatus = (
    req: InsurancePlanSupportingInfoRequirement,
  ): RequirementStatus => {
    const matchingEntry = itemSpecificSupportingInfo.find(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code,
    );
    if (!matchingEntry) return "missing";
    const hasValue =
      matchingEntry.value_string ||
      matchingEntry.value_attachment ||
      matchingEntry.value_file ||
      matchingEntry.value_resource?.resource_id;
    return hasValue ? "satisfied" : "incomplete";
  };

  // No useMemo: form.watch returns the same array reference when nested fields
  // are mutated in place, so a memo keyed on itemSpecificSupportingInfo would
  // cache stale statuses even after the user enters a value.
  const requirementStatuses = requiredRequirements.map((req) => ({
    req,
    status: getRequirementStatus(req),
  }));

  const recommendedStatuses = recommendedRequirements.map((req) => ({
    req,
    status: getRequirementStatus(req),
  }));

  const checklistValidation = getChecklistValidationCounts([
    ...requirementStatuses.map(({ status }) => ({
      status,
      isRequired: true,
    })),
    ...recommendedStatuses.map(({ status }) => ({
      status,
      isRequired: false,
    })),
  ]);

  const manualSupportingInfoEntries = itemSpecificSupportingInfo.filter(
    (info) =>
      !allSupportingInfoRequirements.some(
        (req) =>
          req.category_code === info.category?.code &&
          req.code_code === info.code?.code,
      ),
  );
  const manualCardValidation = getCardSectionValidationCounts(
    manualSupportingInfoEntries,
    getClaimSupportingInfoCardError,
  );
  const supportingInfoValidation = mergeValidationCounts(
    checklistValidation,
    manualCardValidation,
  );
  const hasSectionError = hasSectionValidationIssue(supportingInfoValidation);

  const { field: mandatoryDocsField, fieldState: mandatoryDocsFieldState } =
    useController({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: `item.${index}._mandatory_docs_error` as any,
      control: form.control,
    });

  const {
    field: mandatorySupportingInfoField,
    fieldState: mandatorySupportingInfoFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_supporting_info_error` as any,
    control: form.control,
  });

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      checklistValidation,
      "document",
      {
        requiredSingular:
          "1 required document must be uploaded before submitting",
      },
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_docs_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    checklistValidation.requiredMissing,
    checklistValidation.incomplete,
    requiredRequirements.length,
  ]);

  useEffect(() => {
    const nextError = getSectionVirtualErrorMessage(
      manualCardValidation,
      "supporting information entry",
    );
    syncVirtualFormErrorFromForm(
      form,
      `item.${index}._mandatory_supporting_info_error`,
      nextError,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    index,
    manualCardValidation.incomplete,
    manualSupportingInfoEntries.length,
  ]);

  const supportingInfoCardsErrorMessage =
    mandatorySupportingInfoFieldState.error?.message ||
    (mandatorySupportingInfoField.value as string | undefined);

  const addSupportingInfoForRequirement = (
    req: InsurancePlanSupportingInfoRequirement,
  ) => {
    const alreadyAdded = itemSpecificSupportingInfo.some(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code,
    );
    if (!alreadyAdded) {
      const currentSupportingInfo = form.getValues("supporting_info") || [];
      const currentQRSeqs = (
        form.getValues("questionnaire_responses") ?? []
      ).map((qr) => qr.sequence);
      const newSequence =
        Math.max(
          0,
          ...currentSupportingInfo.map((s) => s.sequence),
          ...currentQRSeqs,
        ) + 1;

      // Update information_sequence BEFORE appending to supporting_info so that
      // any intermediate render already sees the new sequence as item-linked
      // (preventing it from flashing as plan-level).
      const currentSequences =
        form.getValues(`item.${index}.information_sequence`) || [];
      form.setValue(`item.${index}.information_sequence`, [
        ...currentSequences,
        newSequence,
      ], USER_EDIT);

      form.setValue("supporting_info", [
        ...currentSupportingInfo,
        {
          sequence: newSequence,
          category: {
            system: req.category.coding?.[0]?.system ?? "",
            code: req.category_code,
            display: req.category.text ?? req.category.coding?.[0]?.display,
          },
          code: {
            system: req.code.coding?.[0]?.system ?? "",
            code: req.code_code,
            display: req.code.text ?? req.code.coding?.[0]?.display,
          },
          timing: undefined,
          value_string: undefined,
          value_attachment: undefined,
          _is_plan_level: false,
        },
      ], USER_EDIT);
    }
    if (!isExpanded) setIsExpanded(true);
  };

  const addNewSupportingInfo = () => {
    const currentSupportingInfo = form.getValues("supporting_info") || [];
    const currentQRSeqs = (form.getValues("questionnaire_responses") ?? []).map(
      (qr) => qr.sequence,
    );
    const newSequence =
      Math.max(
        0,
        ...currentSupportingInfo.map((s) => s.sequence),
        ...currentQRSeqs,
      ) + 1;

    // Update information_sequence BEFORE appending to supporting_info (same
    // ordering rationale as addSupportingInfoForReq above).
    const currentSequences =
      form.getValues(`item.${index}.information_sequence`) || [];
    form.setValue(`item.${index}.information_sequence`, [
      ...currentSequences,
      newSequence,
    ], USER_EDIT);

    form.setValue("supporting_info", [
      ...currentSupportingInfo,
      {
        sequence: newSequence,
        category: undefined as unknown as Coding,
        code: undefined as unknown as Coding,
        timing: undefined,
        value_string: undefined,
        value_attachment: undefined,
        _is_plan_level: false,
      },
    ], USER_EDIT);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          hasSectionError && sectionErrorBorderClass,
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Supporting Information</span>
          {!hasSectionError && itemSpecificSupportingInfo.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificSupportingInfo.length}
            </Badge>
          )}
          <SectionValidationBadges
            counts={supportingInfoValidation}
            requiredLabel={(count) =>
              `${count} doc${count > 1 ? "s" : ""} required`
            }
          />
        </div>
      </div>

      {(mandatoryDocsFieldState.error?.message || mandatoryDocsField.value) && (
        <SectionErrorMessage
          message={
            mandatoryDocsFieldState.error?.message ||
            (mandatoryDocsField.value as string)
          }
        />
      )}
      <SectionErrorMessage message={supportingInfoCardsErrorMessage} />

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {requirementStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Required Documents
              </p>
              <div className="space-y-1.5">
                {requirementStatuses.map(({ req, status }) => {
                  const label =
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const categoryLabel =
                    req.category.text ??
                    req.category.coding?.[0]?.display ??
                    req.category_code;
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "satisfied" && "bg-green-50 text-green-800",
                        status === "incomplete" && "bg-red-50 text-red-800",
                        status === "missing" && "bg-red-50 text-red-800",
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "satisfied" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {label}{" "}
                          <span className="opacity-60 text-xs">
                            ({categoryLabel})
                          </span>
                        </span>
                      </div>
                      {status === "missing" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-red-300 bg-white hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSupportingInfoForRequirement(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                      {status === "incomplete" && (
                        <span className="text-xs text-red-600 shrink-0 font-medium">
                          Upload required
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recommendedStatuses.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recommended Documents
              </p>
              <div className="space-y-1.5">
                {recommendedStatuses.map(({ req, status }) => {
                  const label =
                    req.code.text ??
                    req.code.coding?.[0]?.display ??
                    req.code_code;
                  const categoryLabel =
                    req.category.text ??
                    req.category.coding?.[0]?.display ??
                    req.category_code;
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                        status === "satisfied" && "bg-green-50 text-green-800",
                        (status === "incomplete" || status === "missing") &&
                          "bg-blue-50 text-blue-800",
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "satisfied" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {label}{" "}
                          <span className="opacity-60 text-xs">
                            ({categoryLabel})
                          </span>
                        </span>
                      </div>
                      {status === "missing" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0 border-blue-300 bg-white hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSupportingInfoForRequirement(req);
                          }}
                        >
                          <PlusIcon className="w-3 h-3 mr-0.5" />
                          Add
                        </Button>
                      )}
                      {status === "incomplete" && (
                        <span className="text-xs text-blue-600 shrink-0 font-medium">
                          Upload pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {itemSpecificSupportingInfo.map((info, infoIndex) => {
            const mainInfoIndex = supportingInfoFields.findIndex(
              (i) => i.sequence === info.sequence,
            );
            const matchingRequirement = allSupportingInfoRequirements.find(
              (req) =>
                req.category_code === info.category?.code &&
                req.code_code === info.code?.code,
            );
            const isRequiredDoc = Boolean(matchingRequirement?.is_required);
            const cardError = getClaimSupportingInfoCardError(info);

            return (
              <Card
                key={infoIndex}
                className={cn(cardError && cardErrorBorderClass)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.code`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 w-full">
                          <FormLabel>
                            Code
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
                            {matchingRequirement && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "ml-2 text-xs font-normal",
                                  isRequiredDoc
                                    ? "border-amber-400 text-amber-700"
                                    : "border-blue-400 text-blue-700",
                                )}
                              >
                                {isRequiredDoc ? "Required" : "Recommended"}
                              </Badge>
                            )}
                          </FormLabel>
                          <FormControl>
                            {isRequiredDoc ? (
                              <Input
                                value={
                                  field.value?.display ??
                                  field.value?.code ??
                                  ""
                                }
                                disabled
                                className="bg-muted"
                              />
                            ) : (
                              <Autocomplete
                                options={SUPPORTING_INFO_CODES.map((code) => ({
                                  label: code.display,
                                  value: code.code,
                                }))}
                                value={field.value?.code}
                                onChange={(value) => {
                                  const code = SUPPORTING_INFO_CODES.find(
                                    (code) => code.code === value,
                                  );
                                  if (!code) {
                                    return;
                                  }
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.code`,
                                    code, USER_EDIT);
                                }}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const currentSupportingInfo =
                          form.getValues("supporting_info") || [];
                        const updatedSupportingInfo =
                          currentSupportingInfo.filter(
                            (_, i) => i !== mainInfoIndex,
                          );
                        form.setValue("supporting_info", updatedSupportingInfo, USER_EDIT);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.information_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== info.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.information_sequence`,
                            updatedSequences, USER_EDIT);
                        });
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.timing.start`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.timing.start`,
                                  value ? value.toISOString() : undefined, USER_EDIT);
                              }}
                              placeholder="Select start date and time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`supporting_info.${mainInfoIndex}.timing.end`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.timing.end`,
                                  value ? value.toISOString() : undefined, USER_EDIT);
                              }}
                              placeholder="Select end date and time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`supporting_info.${mainInfoIndex}.category`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          Category
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
                        <FormControl>
                          {isRequiredDoc ? (
                            <Input
                              value={
                                field.value?.display ?? field.value?.code ?? ""
                              }
                              disabled
                              className="bg-muted"
                            />
                          ) : (
                            <Autocomplete
                              options={SUPPORTING_INFO_CATEGORIES.map(
                                (code) => ({
                                  label: code.display,
                                  value: code.code,
                                }),
                              )}
                              value={field.value?.code}
                              onChange={(value) => {
                                const code = SUPPORTING_INFO_CATEGORIES.find(
                                  (code) => code.code === value,
                                );
                                if (!code) {
                                  return;
                                }
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.category`,
                                  code, USER_EDIT);
                              }}
                            />
                          )}
                        </FormControl>
                        {matchingRequirement && (
                          <p
                            className={cn(
                              "text-xs",
                              isRequiredDoc
                                ? "text-amber-600"
                                : "text-blue-600",
                            )}
                          >
                            {isRequiredDoc
                              ? "Required by insurance plan benefit"
                              : "Recommended by insurance plan benefit"}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <SupportingInfoValueControls
                    form={form}
                    mainInfoIndex={mainInfoIndex}
                    renderText={() => (
                      <FormField
                        control={form.control}
                        name={`supporting_info.${mainInfoIndex}.value_string`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>Value (Text)</FormLabel>
                            <FormControl>
                              <Textarea
                                value={field.value || ""}
                                onChange={(e) => {
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.value_string`,
                                    e.target.value || undefined, USER_EDIT);
                                }}
                                placeholder="Enter supporting info value"
                                className="min-h-[80px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    renderAttachment={() => (
                      <SupportingInfoFileUpload
                        form={form}
                        mainInfoIndex={mainInfoIndex}
                      />
                    )}
                  />
                </CardContent>
                {cardError && <FormCardErrorFooter message={cardError} />}
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addNewSupportingInfo}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Supporting Information
          </Button>
        </div>
      )}
    </div>
  );
}

function SupportingInfoFileUpload({
  form,
  mainInfoIndex,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  mainInfoIndex: number;
}) {
  const currentFile = form.watch(`supporting_info.${mainInfoIndex}.value_file`);
  const attachmentId = form.watch(
    `supporting_info.${mainInfoIndex}.value_attachment`,
  );

  const { data: existingFile, isLoading: isFileLoading } = useQuery({
    queryKey: ["file", attachmentId],
    queryFn: () => apis.file.get(attachmentId as string),
    enabled: !!attachmentId && !currentFile,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue(`supporting_info.${mainInfoIndex}.value_file`, file, USER_EDIT);
      form.setValue(`supporting_info.${mainInfoIndex}.value_string`, undefined, USER_EDIT);
    }
  };

  const handleRemoveFile = () => {
    form.setValue(`supporting_info.${mainInfoIndex}.value_file`, undefined, USER_EDIT);
  };

  return (
    <FormField
      control={form.control}
      name={`supporting_info.${mainInfoIndex}.value_file`}
      render={() => (
        <FormItem className="space-y-1.5">
          <FormLabel>Value (Attachment)</FormLabel>
          <FormControl>
            <div className="space-y-2">
              {currentFile && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {currentFile.type.includes("image") ? (
                      <img
                        src={URL.createObjectURL(currentFile)}
                        alt={currentFile.name}
                        className="h-12 w-12 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 border">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(currentFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!currentFile && isFileLoading && attachmentId && (
                <Skeleton className="h-[72px] w-full rounded-lg" />
              )}

              {!currentFile && existingFile?.read_signed_url && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {existingFile.extension &&
                    ["jpg", "jpeg", "png", "gif", "webp"].includes(
                      existingFile.extension.toLowerCase(),
                    ) ? (
                      <img
                        src={existingFile.read_signed_url}
                        alt={existingFile.name || "attachment"}
                        className="h-12 w-12 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 border">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={existingFile.read_signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary truncate hover:underline"
                    >
                      {existingFile.name ||
                        `file.${existingFile.extension || "bin"}`}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Remote attachment
                    </p>
                  </div>
                </div>
              )}

              {!currentFile && !existingFile?.read_signed_url && (
                <div className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center justify-center w-full"
                  >
                    <Label className="button-size-default button-shape-square button-primary-default inline-flex h-min w-full cursor-pointer items-center justify-center gap-2 whitespace-pre font-medium outline-offset-1 transition-all duration-200 ease-in-out">
                      <PaperclipIcon className="h-5 w-5" />
                      <span>Add Attachment</span>
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json"
                      />
                    </Label>
                  </Button>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
