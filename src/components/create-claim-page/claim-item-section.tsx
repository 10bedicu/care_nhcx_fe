import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  CopyIcon,
  InfoIcon,
  LockIcon,
  MessageCircleQuestionIcon,
  PaperclipIcon,
  PlusIcon,
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
  countImplantLineItemsForParent,
  findExistingImplantItemIndex,
  findOverlappingBenefitItemIndexes,
  findStratificationOverlapIndexes,
  getLinkedImplantsForParent,
  getQualifierTypeByCode,
  isModifierRequired,
  isUnspecifiedProcedureCode,
  isUnspecifiedProcedureOnly,
  LM100_OVERLAP_ERROR,
  normalizeImplantItemsFromPrefill,
  STRATIFICATION_OVERLAP_ERROR,
  UNSPECIFIED_PROCEDURE_COPAY_ERROR,
  UNSPECIFIED_PROCEDURE_PROCEDURE_REQUIRED_ERROR,
} from "@/lib/benefit-item-validation";
import {
  formatItemQueryReasons,
  getItemResponseAdjudication,
  isItemApproved,
  isItemQueried,
  itemStatusBadgeClass,
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
import Autocomplete from "../ui/autocomplete";
import { Badge } from "../ui/badge";
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Coding } from "@/types/base";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { DateTimePicker } from "../ui/date-time-picker";
import { InlineLoading } from "@/components/common/loading-spinner";
import { Input } from "../ui/input";
import { InsurancePlanSupportingInfoRequirement } from "@/types/insurance_plan";
import { Label } from "../ui/label";
import { SupportingInfoValueControls } from "./supporting-info-value-controls";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_LABEL,
  cn,
  isAllowedUploadFile,
  toast,
} from "@/lib/utils";
import { createClaimFormSchema } from "./schema";
import { LAMA_DAMA_PROCEDURE_BENEFIT_CODE } from "./lama-dama-helpers";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const USER_EDIT = { shouldDirty: true, shouldValidate: true } as const;

interface ClaimItemSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  queryResponse?: ClaimResponse;
  lockApprovedItems?: boolean;
  isResubmit?: boolean;
  walletBalance?: number | null;
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

export const SUPPORTING_INFO_CODES = [
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
    code: "DCB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Discharge card/ slip issued by Government hospitals for birth of a child",
  },
  {
    code: "CFIG",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Certificate of Identity having photo issued by MP or MLA or MLC or Municipal Councillor or Gazetted Officer on UIDAI standard certificate format",
  },
  {
    code: "CFIP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Certificate of Identity having photo and relationship with HoF issued by Village Panchayat Head or Mukhiya or its equivalent authority (for rural areas)",
  },
  {
    code: "CFIE",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Certificate of Identity containing Name, DOB and Photo issued by Recognized Educational Institution signed by Head of Institute on UIDAI standard certificate format",
  },
  {
    code: "CFIU",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Certificate of identity containing Name, DOB and Photograph issued by Employees Provident Fund Organisation (EPFO) on UIDAI standard certificate format",
  },
  {
    code: "SSLC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "SSLC Book/ Certificate",
  },
  {
    code: "MRU",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Marksheet issued by any Government Board or University",
  },
  {
    code: "PIC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Government Photo ID Card/ Photo Identity Card issued by PSU containing DOB",
  },
  {
    code: "ESR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Extract of School Records issued by Head of School containing Name, Date of Birth and Photograph",
  },
  {
    code: "PS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Photograph of self",
  },
  {
    code: "PF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Photograph of family",
  },
  {
    code: "PD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Photograph of dead person",
  },
  {
    code: "PCA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Photograph (any other required for claims adjudication)",
  },
  {
    code: "SDF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Self signed declaration form",
  },
  {
    code: "HDF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Hospital stamped and signed hospital declaration form",
  },
  {
    code: "MDF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Any other consent form or miscellaneous declaration form",
  },
  {
    code: "WS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Self signature (wet signature) scanned copy",
  },
  {
    code: "HS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Hospital signature and stamp (scanned copy)",
  },
  {
    code: "MDC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Medical Certificate",
  },
  {
    code: "FB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Final Bill",
  },
  {
    code: "IB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Interim Bill",
  },
  {
    code: "ESB",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Estimate Bill",
  },
  {
    code: "LIR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Lab Investigation Report",
  },
  {
    code: "RDR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Radiology Report",
  },
  {
    code: "IR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Imaging Report with study",
  },
  {
    code: "GAR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Genetic Assessment Report",
  },
  {
    code: "DRRL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Doctor Referral letter (to specialist)",
  },
  {
    code: "URL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Upward Referral Letter (referral from HWC, SC, PHC,CHC to District Hospital)",
  },
  {
    code: "DRL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Downward Referral Letter (referral from higher facility to the original referee facility)",
  },
  {
    code: "IHRL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Inter Hospital Referral Letter",
  },
  {
    code: "DRRLH",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Doctor Referral letter (to hospital)",
  },
  {
    code: "DSTEL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Doctor signed treatment extension letter",
  },
  {
    code: "DSDEL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Doctor signed discharge extension letter",
  },
  {
    code: "PDRRL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Post discharge readmission request letter",
  },
  {
    code: "DRP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Doctor Prescription",
  },
  {
    code: "CSN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Consultation Summary Note",
  },
  {
    code: "DPN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Daily progress note",
  },
  {
    code: "NN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Nursing note",
  },
  {
    code: "OSN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "OT Surgery Note",
  },
  {
    code: "FS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Flowsheet",
  },
  {
    code: "IMR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ICU monitoring reports with note",
  },
  {
    code: "MDN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Medication Diapensation Note",
  },
  {
    code: "CP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "CarePlan",
  },
  {
    code: "ETN",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Emergency Treatment Note",
  },
  {
    code: "BMR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Bedside monitoring report",
  },
  {
    code: "PCTR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Point of care testing report",
  },
  {
    code: "FIR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "FIR report",
  },
  {
    code: "DTH",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "DischargeToHome (Discharge disposition status)",
  },
  {
    code: "DTM",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "DischargetoMortuary(death disposition)",
  },
  {
    code: "DTU",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "DischargeToUnknownLocation",
  },
  {
    code: "DTS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "DischargeToDifferentState",
  },
  {
    code: "DTC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "DischargeToDifferentCountry",
  },
  {
    code: "ADDD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Admission date -Discharge date",
  },
  {
    code: "DSDE",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Discharge start-discharge end time",
  },
  {
    code: "PNR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PatientNormalRoom (start datetime- enddatetime)",
  },
  {
    code: "PER",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PatientEmergencyRoom(start datetime-enddatetime)",
  },
  {
    code: "PSP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PatientSurgeryPerformed(startdatetime-enddatetime)",
  },
  {
    code: "PIS",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PatientICUStay (startdatetime-enddatetime)",
  },
  {
    code: "PPD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ProcedurePerformedDetail",
  },
  {
    code: "PPDT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ProcedurePerformedDateTime",
  },
  {
    code: "SRD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ServiceRenderedDetail",
  },
  {
    code: "SRDT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ServiceRenderedDateTime",
  },
  {
    code: "IPD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "InvestigationPerformedDetail",
  },
  {
    code: "IPDT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "InvestigationPerformedDetailDateTime",
  },
  {
    code: "IPE",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "InsurancePolicyExclusion",
  },
  {
    code: "CPNC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "CostlyProcedureNotCoveredInPolicy",
  },
  {
    code: "EMNC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ExpensiveMedicinesNotCoveredinPackage",
  },
  {
    code: "CDNC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ConsummablesAndDisposiblesNotcoveredinPolicy",
  },
  {
    code: "ED",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "EmploymentDetail",
  },
  {
    code: "CIA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Cause of Injury or Accident",
  },
  {
    code: "PCAI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Patient Condition at time of admission after injury",
  },
  {
    code: "VAD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Vehicle Acident detail",
  },
  {
    code: "FBD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Fire Burns detail",
  },
  {
    code: "SBD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Snake Bite detail",
  },
  {
    code: "ESD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Electric Shock detail",
  },
  {
    code: "CPSD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Consumption of Poisonous substance detail(FIR Registered or not)",
  },
  {
    code: "AHBD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Attack on human body detail (FIR Registered or not)",
  },
  {
    code: "ITPP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ImmediateTreatmentProvidedToPatientAfterAccident",
  },
  {
    code: "PCDT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "AnyPreviousClaimsDueToAccident (previous claim detail)",
  },
  {
    code: "DOA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Date of Accident or Injury",
  },
  {
    code: "DHDA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Date-Time of Hospitalization Due to Accident",
  },
  {
    code: "EDT",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "EncounterDateTime",
  },
  {
    code: "ET",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "EncounterType",
  },
  {
    code: "RC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "ReasonCode (encounter reason)",
  },
  {
    code: "EO",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "EncounterOutcome",
  },
  {
    code: "CRD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Claim received date time",
  },
  {
    code: "DD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "document detail (submitted with claims)",
  },
  {
    code: "CNCR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "courier number of claim reciept",
  },
  {
    code: "MLC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "MLC Case (Boolean Y/N)",
  },
  {
    code: "MPC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "MultiPayorClaim (Boolean Y/N)",
  },
  {
    code: "PSPD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Primary and Secondary Payor Detail (in case of Multi Payor claim)",
  },
  {
    code: "POSC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PrimaryorSecondaryClaim",
  },
  {
    code: "DCSPP",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Details of claim settled by primary payor (in case of secondary claims - attachment)",
  },
  {
    code: "PIPC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "PMJAYInsurancePortabilityCase (Y/N) (treatment received in a different state)",
  },
  {
    code: "PSD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "PrimarySHADetails (SHA/TPA detail of state where PMJAY benefeciary belongs to)",
  },
  {
    code: "SSD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "SecondarySHADetails (SHA/TPA detail of state where benefeciary received treatment)",
  },
  {
    code: "EI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "EmploymentImpacted (Y/N) for long disabilities)",
  },
  {
    code: "EID",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Employment impacted period (start date - end date)",
  },
  {
    code: "HI",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "HospitalizedIndicator (if patient was hospitalized or not - Y/N)",
  },
  {
    code: "MF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Materials Forwarded",
  },
  {
    code: "CQD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Claim query detail",
  },
  {
    code: "TD",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Treatment detail",
  },
  {
    code: "ARC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Additional info related to claim ( conveying additional situation and condition information.)",
  },
  {
    code: "BCF",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display:
      "Birth Certificate issued by Registrar of Birth, Municipal Corporation and other notified local government bodies like Taluk, Tehsil etc.",
  },
  {
    code: "PBC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "PMJAY Beneficiary Card",
  },
  {
    code: "IC",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Insurance Card",
  },
  {
    code: "EMPID",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Employment ID card",
  },
  {
    code: "PAL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Preauthorization approval letter",
  },
  {
    code: "CAL",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Claim approval letter",
  },
  {
    code: "DCR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Discharge Summary Report",
  },
  {
    code: "DSR",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Death Summary Report",
  },
  {
    code: "LAMA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Discharge Summary with LAMA",
  },
  {
    code: "DAMA",
    system: "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-supportinginfo-code",
    display: "Discharge Summary with DAMA",
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
  queryResponse,
  lockApprovedItems = false,
  isResubmit = false,
  walletBalance = null,
}: ClaimItemSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

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
        ),
        USER_EDIT,
      );
      form.setValue(
        "questionnaire_responses",
        (form.getValues("questionnaire_responses") ?? []).filter(
          (qr) => !orphanedInfoSeqs.includes(qr.sequence),
        ),
        USER_EDIT,
      );
    }

    const orphanedCTSeqs = [...careTeamSeqs].filter(
      (seq) => !stillUsedCareTeamSeqs.has(seq),
    );
    if (orphanedCTSeqs.length > 0) {
      form.setValue(
        "care_team",
        (form.getValues("care_team") ?? []).filter(
          (ct) => !orphanedCTSeqs.includes(ct.sequence),
        ),
        USER_EDIT,
      );
    }

    const orphanedDxSeqs = [...diagnosisSeqs].filter(
      (seq) => !stillUsedDiagnosisSeqs.has(seq),
    );
    if (orphanedDxSeqs.length > 0) {
      form.setValue(
        "diagnosis",
        (form.getValues("diagnosis") ?? []).filter(
          (dx) => !orphanedDxSeqs.includes(dx.sequence),
        ),
        USER_EDIT,
      );
    }

    const orphanedProcSeqs = [...procedureSeqs].filter(
      (seq) => !stillUsedProcedureSeqs.has(seq),
    );
    if (orphanedProcSeqs.length > 0) {
      form.setValue(
        "procedure",
        (form.getValues("procedure") ?? []).filter(
          (proc) => !orphanedProcSeqs.includes(proc.sequence),
        ),
        USER_EDIT,
      );
    }

    remove(index);
  };

  const addImplantLineItem = (parentIndex: number, implant: Coding) => {
    const parentSequence = form.getValues(`item.${parentIndex}.sequence`);
    const allItems = form.getValues("item") ?? [];
    const existingIndex = findExistingImplantItemIndex(
      allItems,
      parentSequence,
      implant.code,
    );
    if (existingIndex >= 0) {
      const existing = allItems[existingIndex];
      if (
        existing._implant_parent_sequence === parentSequence &&
        existing._implant_code === implant.code
      ) {
        return;
      }
      form.setValue(
        `item.${existingIndex}._implant_parent_sequence`,
        parentSequence,
        { shouldDirty: false },
      );
      form.setValue(`item.${existingIndex}._implant_code`, implant.code, {
        shouldDirty: false,
      });
      void form.trigger("item");
      return;
    }
    const nextSequence =
      Math.max(0, ...allItems.map((f) => f.sequence ?? 0)) + 1;
    append({
      sequence: nextSequence,
      category: form.getValues(`item.${parentIndex}.category`),
      product_or_service: implant,
      modifier: [],
      program_code: [
        ...(form.getValues(`item.${parentIndex}.program_code`) ?? []),
      ],
      serviced_period: form.getValues(`item.${parentIndex}.serviced_period`),
      care_team_sequence: [
        ...(form.getValues(`item.${parentIndex}.care_team_sequence`) ?? []),
      ],
      diagnosis_sequence: [
        ...(form.getValues(`item.${parentIndex}.diagnosis_sequence`) ?? []),
      ],
      procedure_sequence: [
        ...(form.getValues(`item.${parentIndex}.procedure_sequence`) ?? []),
      ],
      information_sequence: [
        ...(form.getValues(`item.${parentIndex}.information_sequence`) ?? []),
      ],
      charge_items: [],
      quantity: { value: 1 },
      unit_price: 0,
      factor: undefined,
      _implant_parent_sequence: parentSequence,
      _implant_code: implant.code,
    });
    void form.trigger("item");
  };

  const removeItemAndImplants = (index: number) => {
    const allItems = form.getValues("item") ?? [];
    const parentSequence = allItems[index]?.sequence;
    const childIndexes =
      parentSequence != null
        ? allItems
            .map((it, i) => ({ it, i }))
            .filter(({ it }) => it._implant_parent_sequence === parentSequence)
            .map(({ i }) => i)
        : [];
    [...childIndexes]
      .sort((a, b) => b - a)
      .forEach((i) => removeItemWithCleanup(i));
    const parentIndex = form
      .getValues("item")
      .findIndex((it) => it.sequence === parentSequence);
    if (parentIndex >= 0) {
      removeItemWithCleanup(parentIndex);
    }
  };

  const duplicateItem = (index: number) => {
    const source = form.getValues(`item.${index}`);
    const allItems = form.getValues("item") ?? [];
    const nextSequence =
      Math.max(0, ...allItems.map((f) => f.sequence ?? 0)) + 1;
    append({
      sequence: nextSequence,
      care_team_sequence: [...(source.care_team_sequence ?? [])],
      diagnosis_sequence: [...(source.diagnosis_sequence ?? [])],
      procedure_sequence: [...(source.procedure_sequence ?? [])],
      information_sequence: [...(source.information_sequence ?? [])],
      category: source.category,
      product_or_service: source.product_or_service,
      charge_items: [],
      modifier: (source.modifier ?? []).map((m) => ({ ...m })),
      program_code: (source.program_code ?? []).map((c) => ({ ...c })),
      serviced_period: source.serviced_period
        ? { ...source.serviced_period }
        : undefined,
      quantity: { ...source.quantity },
      unit_price: source.unit_price ?? 0,
      factor: source.factor,
      _is_duplicate: true,
    });
    void form.trigger("item");
  };

  const addLm100Item = () => {
    const allItems = form.getValues("item") ?? [];
    const templateLm100 = allItems.find(
      (it) =>
        it.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE &&
        !it._is_disabled,
    );
    if (!templateLm100) return;
    const nextSequence =
      Math.max(0, ...allItems.map((f) => f.sequence ?? 0)) + 1;
    append({
      sequence: nextSequence,
      care_team_sequence: [...(templateLm100.care_team_sequence ?? [])],
      diagnosis_sequence: [...(templateLm100.diagnosis_sequence ?? [])],
      procedure_sequence: [],
      information_sequence: [],
      category: templateLm100.category,
      product_or_service: templateLm100.product_or_service,
      charge_items: [],
      modifier: [],
      program_code: (templateLm100.program_code ?? []).map((c) => ({ ...c })),
      serviced_period: undefined,
      quantity: { value: 1 },
      unit_price: 0,
      factor: undefined,
    });
    void form.trigger("item");
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

  const overlappingLm100Indexes = findOverlappingBenefitItemIndexes(
    watchedItems ?? [],
    LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
  );

  const duplicateItemIndexes = findStratificationOverlapIndexes(
    watchedItems ?? [],
  );

  useEffect(() => {
    const items = form.getValues("item") ?? [];
    if (items.length === 0) return;
    const normalized = normalizeImplantItemsFromPrefill(items);
    const serialize = (list: typeof items) =>
      JSON.stringify(
        list.map((it) => [
          it.sequence,
          it._implant_parent_sequence,
          it._implant_code,
          (it.modifier ?? []).map((m) => m.code),
        ]),
      );
    if (serialize(normalized) !== serialize(items)) {
      form.setValue("item", normalized, { shouldDirty: false });
    }
  }, [watchedItems, form]);

  useEffect(() => {
    (watchedItems ?? []).forEach((item, index) => {
      if (!item._is_disabled) return;
      form.clearErrors(`item.${index}`);
    });
  }, [watchedItems, form]);

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
          const mandatoryProcedureError =
            watchedItems?.[index]?._mandatory_procedure_error;
          const mandatorySupportingInfoError =
            watchedItems?.[index]?._mandatory_supporting_info_error;
          const amountCapError = watchedItems?.[index]?._amount_cap_error;
          const conditionErrors = watchedItems?.[index]?._condition_errors;
          const isItemDisabled = !!watchedItems?.[index]?._is_disabled;
          const isUnspecifiedAlone =
            isUnspecifiedProcedureCode(
              watchedItems?.[index]?.product_or_service?.code,
            ) && isUnspecifiedProcedureOnly(watchedItems ?? []);
          const isUnspecifiedManualPrice = isUnspecifiedAlone;
          const overlapError =
            !isItemDisabled && overlappingLm100Indexes.has(index)
              ? LM100_OVERLAP_ERROR
              : undefined;
          const duplicateError =
            !isItemDisabled && duplicateItemIndexes.has(index)
              ? STRATIFICATION_OVERLAP_ERROR
              : undefined;
          const itemSequence = watchedItems?.[index]?.sequence ?? index + 1;
          const itemQueryAdjudication = getItemResponseAdjudication(
            queryResponse,
            itemSequence,
          );
          const isQueriedItem = isItemQueried(itemQueryAdjudication);
          const itemQueryReasons = formatItemQueryReasons(
            itemQueryAdjudication,
          );
          const isImplantItem = Boolean(
            watchedItems?.[index]?._implant_parent_sequence,
          );
          const itemApprovalAdjudication = getItemResponseAdjudication(
            previousClaim?.latest_response,
            itemSequence,
          );
          const isApprovedItem =
            lockApprovedItems &&
            !isImplantItem &&
            !isItemDisabled &&
            isItemApproved(itemApprovalAdjudication);
          const originalServicedEnd = getPreviousClaimItemServicedEnd(
            previousClaim,
            itemSequence,
          );
          const allowServiceEndEdit = isApprovedItem && !originalServicedEnd;
          const hasAnyError =
            !isItemDisabled &&
            (mandatoryDocsError ||
              mandatoryQuestionnairesError ||
              mandatoryCareTeamError ||
              mandatoryDiagnosisError ||
              mandatoryProcedureError ||
              mandatorySupportingInfoError ||
              amountCapError ||
              conditionErrors ||
              overlapError ||
              duplicateError);
          return (
            <Card
              key={field.id}
              className={cn(
                hasAnyError && "overflow-hidden border-red-500",
                isItemDisabled && "opacity-60",
                isApprovedItem && "border-emerald-200",
              )}
            >
              {isItemDisabled && (
                <div className="px-6 pt-4">
                  <Badge variant="secondary" className="text-xs">
                    Disabled for LAMA/DAMA before or during treatment
                  </Badge>
                </div>
              )}
              {isApprovedItem && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
                  <div className="flex items-center gap-2">
                    <Badge className={itemStatusBadgeClass("approved")}>
                      Approved
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Locked by payer approval, duplicate to change
                      stratification or quantity.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateItem(index)}
                  >
                    <CopyIcon className="mr-1.5 h-4 w-4" />
                    Duplicate to edit
                  </Button>
                </div>
              )}
              <div
                className={cn(
                  (isItemDisabled || isApprovedItem) &&
                    "pointer-events-none select-none",
                )}
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
                                categoryCode={
                                  form.watch(`item.${index}.category`)?.code
                                }
                                categoryDisplay={
                                  form.watch(`item.${index}.category`)?.display
                                }
                                onSelect={(benefit) => {
                                  form.setValue(
                                    `item.${index}.product_or_service`,
                                    {
                                      system: PROCEDURE_CODE_SYSTEM,
                                      code: benefit.type_code,
                                      display: benefit.type_display,
                                    },
                                    USER_EDIT,
                                  );
                                  form.setValue(
                                    `item.${index}.category`,
                                    {
                                      system: BENEFIT_CATEGORY_SYSTEM,
                                      code: benefit.coverage_type_code,
                                      display: benefit.coverage_type_display,
                                    },
                                    USER_EDIT,
                                  );
                                  const existing =
                                    form.getValues(
                                      `item.${index}.program_code`,
                                    ) ?? [];
                                  if (
                                    !existing.find((c) => c.code === "AB-PMJAY")
                                  ) {
                                    form.setValue(
                                      `item.${index}.program_code`,
                                      [...existing, AB_PMJAY_CODE],
                                      USER_EDIT,
                                    );
                                  }
                                }}
                                disabled={isProductLocked}
                              />
                            </FormControl>
                            {isProductLocked && (
                              <p className="text-xs text-muted-foreground">
                                {isImplantItem
                                  ? "Auto-added implant. Manage it from the originating item."
                                  : isApprovedItem
                                    ? "Approved by the payer. Duplicate this item to change its stratification or quantity."
                                    : "Product is locked. Remove this item and add a new one to change it."}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemAndImplants(index)}
                            className={cn(
                              "mt-6",
                              (isImplantItem || isApprovedItem) && "hidden",
                            )}
                            disabled={isItemDisabled || isApprovedItem}
                          >
                            <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                          </Button>
                        </div>
                      );
                    }}
                  />
                </CardHeader>
                ;
                {!isItemDisabled && (
                  <>
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
                      <CategoryField
                        form={form}
                        index={index}
                        planId={planId}
                        keyId={field.id}
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
                                        : [...field.value, code],
                                      USER_EDIT,
                                    );
                                  }}
                                />

                                <div className="flex flex-wrap gap-2">
                                  {field.value.map((code) => (
                                    <Badge
                                      key={code.code}
                                      className="flex gap-2"
                                    >
                                      {code.display}
                                      <XIcon
                                        className="w-4 h-4 cursor-pointer"
                                        onClick={() => {
                                          form.setValue(
                                            `item.${index}.program_code`,
                                            field.value.filter(
                                              (c) => c.code !== code.code,
                                            ),
                                            USER_EDIT,
                                          );
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

                      <ModifierField
                        form={form}
                        index={index}
                        planId={planId}
                        disabled={isImplantItem}
                        onImplantAdd={(implant) =>
                          addImplantLineItem(index, implant)
                        }
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
                      <AddProcedureSection
                        form={form}
                        index={index}
                        requireProcedure={isUnspecifiedAlone}
                      />
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
                        isResubmit={isResubmit}
                      />
                      <AddQuestionnaireSection
                        form={form}
                        index={index}
                        planId={planId}
                        coverageEligibilityRequest={coverageEligibilityRequest}
                        claimUse={claimUse}
                        isResubmit={isResubmit}
                      />

                      <ItemValidationEffects
                        form={form}
                        index={index}
                        planId={planId}
                        coverageEligibilityRequest={coverageEligibilityRequest}
                        previousClaim={previousClaim}
                        isResubmit={isResubmit}
                        isUnspecifiedAlone={isUnspecifiedAlone}
                        walletBalance={walletBalance}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`item.${index}.serviced_period.start`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel>
                                Service Period Start
                                <span className="text-red-500 text-sm ml-0.5">
                                  *
                                </span>
                              </FormLabel>
                              <FormControl>
                                <DateTimePicker
                                  value={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onChange={(value) => {
                                    form.setValue(
                                      `item.${index}.serviced_period.start`,
                                      value ? value.toISOString() : "",
                                      USER_EDIT,
                                    );
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
                            <FormItem
                              className={cn(
                                "space-y-1.5",
                                allowServiceEndEdit &&
                                  "pointer-events-auto select-auto",
                              )}
                            >
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
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onChange={(value) => {
                                    form.setValue(
                                      `item.${index}.serviced_period.end`,
                                      value ? value.toISOString() : undefined,
                                      USER_EDIT,
                                    );
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
                                <span className="text-red-500 text-sm ml-0.5">
                                  *
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    form.setValue(
                                      `item.${index}.quantity.value`,
                                      e.target.value
                                        ? parseFloat(e.target.value)
                                        : 0,
                                      USER_EDIT,
                                    );
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
                                      value,
                                      USER_EDIT,
                                    );
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
                                <span className="text-red-500 text-sm ml-0.5">
                                  *
                                </span>
                              </FormLabel>
                              <FormControl>
                                {isUnspecifiedManualPrice ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      form.setValue(
                                        `item.${index}.unit_price`,
                                        e.target.value
                                          ? parseFloat(e.target.value)
                                          : 0,
                                        USER_EDIT,
                                      );
                                    }}
                                    placeholder="Enter unit price"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/40 text-sm font-medium">
                                    <span className="text-muted-foreground">
                                      ₹
                                    </span>
                                    <span>{(field.value ?? 0).toFixed(2)}</span>
                                  </div>
                                )}
                              </FormControl>
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
                                        : undefined,
                                      USER_EDIT,
                                    );
                                  }}
                                  placeholder="Enter factor"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <ItemTotalAmount form={form} index={index} />

                      <ItemAmountReferences
                        form={form}
                        index={index}
                        planId={planId}
                        coverageEligibilityRequest={coverageEligibilityRequest}
                        previousClaim={previousClaim}
                        isResubmit={isResubmit}
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
                        {overlapError && (
                          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                            <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                            {overlapError}
                          </div>
                        )}
                        {duplicateError && (
                          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                            <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                            {duplicateError}
                          </div>
                        )}
                      </CardFooter>
                    )}
                  </>
                )}
              </div>
            </Card>
          );
        })}

        {(watchedItems ?? []).some(
          (it) =>
            it?.product_or_service?.code === LAMA_DAMA_PROCEDURE_BENEFIT_CODE &&
            !it?._is_disabled,
        ) && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addLm100Item}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add LM100
          </Button>
        )}

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

function CategoryField({
  form,
  index,
  planId,
  keyId,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  keyId: string;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const hasProduct = Boolean(productCode);
  const isLm100 = productCode === LAMA_DAMA_PROCEDURE_BENEFIT_CODE;

  const { data: lm100BenefitList } = useQuery({
    queryKey: [
      "insurancePlanBenefit",
      "list",
      planId,
      LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
    ],
    queryFn: () =>
      apis.insurancePlanBenefit.list({
        insurance_plan: planId!,
        type_code: LAMA_DAMA_PROCEDURE_BENEFIT_CODE,
      }),
    enabled: Boolean(planId && isLm100),
    staleTime: 5 * 60 * 1000,
  });

  const lm100Categories = useMemo<Coding[]>(() => {
    const seen = new Set<string>();
    const result: Coding[] = [];
    for (const benefit of lm100BenefitList?.results ?? []) {
      if (!benefit.coverage_type_code || seen.has(benefit.coverage_type_code)) {
        continue;
      }
      seen.add(benefit.coverage_type_code);
      result.push({
        system: BENEFIT_CATEGORY_SYSTEM,
        code: benefit.coverage_type_code,
        display: benefit.coverage_type_display,
      });
    }
    return result;
  }, [lm100BenefitList]);

  return (
    <FormField
      key={keyId}
      control={form.control}
      name={`item.${index}.category`}
      render={({ field }) => {
        if (isLm100) {
          return (
            <FormItem className="space-y-1.5">
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Autocomplete
                  options={lm100Categories.map((category) => ({
                    label: category.display
                      ? `${category.code} - ${category.display}`
                      : category.code,
                    value: category.code,
                  }))}
                  value={field.value?.code}
                  onChange={(value) => {
                    const selected = lm100Categories.find(
                      (category) => category.code === value,
                    );
                    if (selected) {
                      form.setValue(
                        `item.${index}.category`,
                        selected,
                        USER_EDIT,
                      );
                    }
                  }}
                  placeholder={
                    lm100Categories.length === 0
                      ? "No categories available"
                      : "Select a category"
                  }
                  noOptionsMessage="No categories available for LM100"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Choose one of the coverage categories available for LM100.
              </p>
              <FormMessage />
            </FormItem>
          );
        }

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
  );
}

function ModifierField({
  form,
  index,
  planId,
  disabled = false,
  onImplantAdd,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  disabled?: boolean;
  onImplantAdd?: (implant: Coding) => void;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const parentSequence = form.watch(`item.${index}.sequence`);
  const rawAllItems = form.watch("item");

  const linkedImplants = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (parentSequence == null) return [];
    return getLinkedImplantsForParent(allItems, parentSequence);
  }, [rawAllItems, parentSequence]);

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

  const selectableQualifiers = useMemo(
    () =>
      qualifiers.filter((q) => qualifierTypeByCode.get(q.code) !== "implant"),
    [qualifiers, qualifierTypeByCode],
  );

  const didAutofillRef = useRef(false);
  useEffect(() => {
    if (productCode === LAMA_DAMA_PROCEDURE_BENEFIT_CODE) {
      didAutofillRef.current = true;
      return;
    }
    if (didAutofillRef.current) return;
    if (!productCode || qualifiers.length === 0) return;

    const current = form.getValues(`item.${index}.modifier`) ?? [];
    const implantInModifier = current.filter(
      (m) => qualifierTypeByCode.get(m.code) === "implant",
    );
    const nonImplantInModifier = current.filter(
      (m) => qualifierTypeByCode.get(m.code) !== "implant",
    );
    const autofillNonImplants = qualifiers.filter(
      (q) => qualifierTypeByCode.get(q.code) !== "implant",
    );

    if (implantInModifier.length > 0) {
      form.setValue(`item.${index}.modifier`, nonImplantInModifier, {
        shouldDirty: false,
      });
      for (const implant of implantInModifier) {
        onImplantAdd?.(implant);
      }
    } else if (nonImplantInModifier.length === 0 && autofillNonImplants.length > 0) {
      form.setValue(`item.${index}.modifier`, autofillNonImplants, {
        shouldDirty: false,
      });
    }

    if (parentSequence != null) {
      for (const implant of getLinkedImplantsForParent(
        form.getValues("item") ?? [],
        parentSequence,
      )) {
        onImplantAdd?.(implant);
      }
    }

    didAutofillRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCode, qualifiers, qualifierTypeByCode]);

  if (disabled) return null;

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
                  const existing = (field.value ?? []).filter(
                    (c) => qualifierTypeByCode.get(c.code) !== "implant",
                  );
                  if (existing.some((c) => c.code === qualifier.code)) return;
                  form.setValue(
                    `item.${index}.modifier`,
                    [...existing, qualifier],
                    USER_EDIT,
                  );
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
                {(field.value ?? [])
                  .filter(
                    (code) => qualifierTypeByCode.get(code.code) !== "implant",
                  )
                  .map((code) => (
                    <Badge key={code.code} className="flex gap-2">
                      <span className="font-mono">{code.code}</span>
                      {code.display && (
                        <span className="opacity-80"> - {code.display}</span>
                      )}
                      <XIcon
                        className="w-4 h-4 cursor-pointer"
                        onClick={() => {
                          form.setValue(
                            `item.${index}.modifier`,
                            (field.value ?? []).filter(
                              (c) => c.code !== code.code,
                            ),
                            USER_EDIT,
                          );
                        }}
                      />
                    </Badge>
                  ))}
                {linkedImplants.map((implant) => (
                  <Badge key={implant.code} className="flex gap-2">
                    <span className="font-mono">{implant.code}</span>
                    {implant.display && (
                      <span className="opacity-80"> - {implant.display}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function getPreviousClaimItemServicedEnd(
  previousClaim: Claim | undefined,
  sequence: number | undefined,
): string | undefined {
  if (sequence == null) return undefined;
  const matched = (previousClaim?.item ?? []).find(
    (it) => it.sequence === sequence,
  );
  return matched?.serviced_period?.end;
}

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

function getPreAuthApprovedAmount(
  previousClaim: Claim | undefined,
  productCode: string | undefined,
): number | null {
  if (!productCode) return null;
  const responseItems = previousClaim?.latest_response?.item;
  if (!responseItems) return null;

  const sequenceToCode = new Map<number, string | undefined>();
  for (const it of previousClaim?.item ?? []) {
    sequenceToCode.set(it.sequence, it.product_or_service?.code);
  }

  const matched = responseItems.find(
    (ri) =>
      ri.itemSequence != null &&
      sequenceToCode.get(ri.itemSequence) === productCode,
  );
  if (!matched?.adjudication) return null;
  const benefitAdj = matched.adjudication.find((adj) =>
    adj.category?.coding?.some((c) =>
      ["benefit", "approved", "eligible"].includes(c.code ?? ""),
    ),
  );
  return benefitAdj?.amount?.value ?? null;
}

function ItemValidationEffects({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  previousClaim,
  isResubmit = false,
  isUnspecifiedAlone = false,
  walletBalance = null,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  isResubmit?: boolean;
  isUnspecifiedAlone?: boolean;
  walletBalance?: number | null;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const isItemDisabled = form.watch(`item.${index}._is_disabled`);
  const isDuplicateItem = form.watch(`item.${index}._is_duplicate`);
  const quantityValue = form.watch(`item.${index}.quantity.value`);
  const unitPrice = form.watch(`item.${index}.unit_price`);
  const factor = form.watch(`item.${index}.factor`);
  const rawModifiers = form.watch(`item.${index}.modifier`);
  const isImplantItem = Boolean(
    form.watch(`item.${index}._implant_parent_sequence`),
  );
  const currentSequence = form.watch(`item.${index}.sequence`);
  const rawAllItems = form.watch("item");

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)],
  );

  const linkedImplantCount = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (isImplantItem || currentSequence == null) return undefined;
    return countImplantLineItemsForParent(allItems, currentSequence);
  }, [rawAllItems, currentSequence, isImplantItem]);

  const linkedImplantCodes = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (isImplantItem || currentSequence == null) return [];
    return getLinkedImplantsForParent(allItems, currentSequence).map(
      (coding) => coding.code,
    );
  }, [rawAllItems, currentSequence, isImplantItem]);

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

  const qualifierTypeByCode = useMemo(
    () => getQualifierTypeByCode(benefitDetail),
    [benefitDetail],
  );

  const modifierCodesForLimit = useMemo(() => {
    const nonImplantCodes = modifiers
      .filter((m) => qualifierTypeByCode.get(m.code) !== "implant")
      .map((m) => m.code);
    return [...nonImplantCodes, ...linkedImplantCodes];
  }, [modifiers, linkedImplantCodes, qualifierTypeByCode]);

  const benefitLimit = useMemo(() => {
    if (!benefitDetail) return null;
    return computeBenefitLimit(benefitDetail, modifierCodesForLimit);
  }, [benefitDetail, modifierCodesForLimit]);

  const ceAllowed = useMemo(
    () => getCeAllowedAmount(coverageEligibilityRequest, productCode),
    [coverageEligibilityRequest, productCode],
  );
  const preAuthApproved = useMemo(
    () => getPreAuthApprovedAmount(previousClaim, productCode),
    [previousClaim, productCode],
  );

  useEffect(() => {
    if (isItemDisabled) {
      form.setValue(`item.${index}.unit_price`, 0, { shouldDirty: false });
      form.setValue(`item.${index}._amount_cap_error`, undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
      form.setValue(`item.${index}._condition_errors`, undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }

    if (isUnspecifiedAlone) {
      const payerDerived = isResubmit
        ? (ceAllowed ?? preAuthApproved)
        : (preAuthApproved ?? ceAllowed);
      if (payerDerived == null) return;
      form.setValue(`item.${index}.unit_price`, payerDerived, {
        shouldDirty: false,
      });
      form.setValue(`item.${index}._amount_cap_error`, undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }

    const derived = isDuplicateItem
      ? (benefitLimit ?? 0)
      : isResubmit
        ? (ceAllowed ?? preAuthApproved ?? benefitLimit ?? 0)
        : (preAuthApproved ?? ceAllowed ?? benefitLimit ?? 0);
    form.setValue(`item.${index}.unit_price`, derived, { shouldDirty: false });
    form.setValue(`item.${index}._amount_cap_error`, undefined, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [
    preAuthApproved,
    ceAllowed,
    benefitLimit,
    isResubmit,
    isDuplicateItem,
    form,
    index,
    isItemDisabled,
    isUnspecifiedAlone,
    productCode,
  ]);

  useEffect(() => {
    const payerDerived = isResubmit
      ? (ceAllowed ?? preAuthApproved)
      : (preAuthApproved ?? ceAllowed);
    if (isItemDisabled || !isUnspecifiedAlone || payerDerived != null) {
      return;
    }
    const total =
      (Number(unitPrice) || 0) *
      (Number(quantityValue) || 1) *
      (Number(factor) || 1);
    const nextError =
      walletBalance != null && total > walletBalance
        ? UNSPECIFIED_PROCEDURE_COPAY_ERROR
        : undefined;
    const currentError = form.getValues(`item.${index}._amount_cap_error`);
    if (currentError !== nextError) {
      form.setValue(`item.${index}._amount_cap_error`, nextError, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    isItemDisabled,
    isUnspecifiedAlone,
    unitPrice,
    quantityValue,
    factor,
    walletBalance,
    preAuthApproved,
    ceAllowed,
    isResubmit,
    form,
    index,
  ]);

  useEffect(() => {
    if (isItemDisabled) {
      form.setValue(`item.${index}._condition_errors`, undefined, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }
    const errors = isImplantItem
      ? []
      : buildBenefitConditionErrors(
          benefitDetail,
          Number(quantityValue),
          modifiers,
          { linkedImplantCount: linkedImplantCount ?? 0 },
        );

    if (!isImplantItem && productCode === LAMA_DAMA_PROCEDURE_BENEFIT_CODE) {
      const availableStratifications = [...qualifierTypeByCode.values()].filter(
        (type) => type === "stratification",
      ).length;
      const selectedStratifications = modifiers.filter(
        (m) => qualifierTypeByCode.get(m.code) === "stratification",
      ).length;
      if (availableStratifications > 0 && selectedStratifications === 0) {
        errors.push("Stratification is required for LM100");
      }
    }
    const nextError = errors.length > 0 ? errors.join(" • ") : undefined;
    const currentError = form.getValues(`item.${index}._condition_errors`);

    if (currentError !== nextError) {
      form.setValue(`item.${index}._condition_errors`, nextError, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    benefitDetail,
    quantityValue,
    modifiers,
    linkedImplantCount,
    isImplantItem,
    productCode,
    qualifierTypeByCode,
    form,
    index,
    isItemDisabled,
  ]);

  return null;
}

function ItemTotalAmount({
  form,
  index,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
}) {
  const unitPrice = form.watch(`item.${index}.unit_price`) ?? 0;
  const quantity = form.watch(`item.${index}.quantity.value`);
  const factor = form.watch(`item.${index}.factor`);
  const total = unitPrice * (quantity || 1) * (factor || 1);
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium">Total amount</span>
      <span className="text-sm font-semibold">₹{total.toFixed(2)}</span>
    </div>
  );
}

function ItemAmountReferences({
  form,
  index,
  planId,
  coverageEligibilityRequest,
  previousClaim,
  isResubmit = false,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  isResubmit?: boolean;
}) {
  const productCode = form.watch(`item.${index}.product_or_service`)?.code;
  const itemSequence = form.watch(`item.${index}.sequence`);
  const isDuplicateItem = form.watch(`item.${index}._is_duplicate`);
  const rawModifiers = form.watch(`item.${index}.modifier`);
  const isImplantItem = Boolean(
    form.watch(`item.${index}._implant_parent_sequence`),
  );
  const rawAllItems = form.watch("item");

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)],
  );

  const linkedImplantCodes = useMemo(() => {
    const allItems = rawAllItems ?? [];
    if (isImplantItem || itemSequence == null) return [];
    return getLinkedImplantsForParent(allItems, itemSequence).map(
      (coding) => coding.code,
    );
  }, [rawAllItems, itemSequence, isImplantItem]);

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

  const qualifierTypeByCode = useMemo(
    () => getQualifierTypeByCode(benefitDetail),
    [benefitDetail],
  );

  const modifierCodesForLimit = useMemo(() => {
    const nonImplantCodes = modifiers
      .filter((m) => qualifierTypeByCode.get(m.code) !== "implant")
      .map((m) => m.code);
    return [...nonImplantCodes, ...linkedImplantCodes];
  }, [modifiers, linkedImplantCodes, qualifierTypeByCode]);

  const benefitLimit = useMemo(() => {
    if (!benefitDetail) return null;
    return computeBenefitLimit(benefitDetail, modifierCodesForLimit);
  }, [benefitDetail, modifierCodesForLimit]);

  const ceAllowed = useMemo(
    () => getCeAllowedAmount(coverageEligibilityRequest, productCode),
    [coverageEligibilityRequest, productCode],
  );
  const preAuthApproved = useMemo(
    () => getPreAuthApprovedAmount(previousClaim, productCode),
    [previousClaim, productCode],
  );

  const refs: Array<{ label: string; value: number; applied?: boolean }> = [];

  if (isDuplicateItem) {
    if (benefitLimit == null) return null;
    return (
      <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Amount references
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">
              Benefit limit
              <Badge
                variant="secondary"
                className="ml-2 text-[10px] px-1.5 py-0"
              >
                Applied
              </Badge>
            </span>
            <span className="font-medium text-foreground">
              ₹{benefitLimit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const appliedSource = isResubmit
    ? ceAllowed != null
      ? "ce"
      : preAuthApproved != null
        ? "preauth"
        : benefitLimit != null
          ? "benefit"
          : null
    : preAuthApproved != null
      ? "preauth"
      : ceAllowed != null
        ? "ce"
        : benefitLimit != null
          ? "benefit"
          : null;
  if (preAuthApproved != null) {
    refs.push({
      label: "Pre-Authorization approved amount",
      value: preAuthApproved,
      applied: appliedSource === "preauth",
    });
  }
  if (ceAllowed != null) {
    refs.push({
      label: "Coverage eligibility allowed amount",
      value: ceAllowed,
      applied: appliedSource === "ce",
    });
  }
  if (benefitLimit != null) {
    refs.push({
      label: "Benefit limit",
      value: benefitLimit,
      applied: appliedSource === "benefit",
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
                ref.applied && "text-foreground font-medium",
              )}
            >
              {ref.label}
              {ref.applied && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[10px] px-1.5 py-0"
                >
                  Applied
                </Badge>
              )}
            </span>
            <span className="font-medium text-foreground">
              ₹{ref.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
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
  const isItemDisabled = form.watch(`item.${index}._is_disabled`);

  const {
    field: mandatoryDiagnosisField,
    fieldState: mandatoryDiagnosisFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_diagnosis_error` as any,
    control: form.control,
  });

  useEffect(() => {
    if (isItemDisabled) {
      syncVirtualFormErrorFromForm(
        form,
        `item.${index}._mandatory_diagnosis_error`,
        undefined,
      );
      return;
    }
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
    isItemDisabled,
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
  requireProcedure = false,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  requireProcedure?: boolean;
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
  const isItemDisabled = form.watch(`item.${index}._is_disabled`);

  const {
    field: mandatoryProcedureField,
    fieldState: mandatoryProcedureFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_procedure_error` as any,
    control: form.control,
  });

  useEffect(() => {
    if (isItemDisabled) {
      syncVirtualFormErrorFromForm(
        form,
        `item.${index}._mandatory_procedure_error`,
        undefined,
      );
      return;
    }
    const nextError =
      requireProcedure && itemSpecificProcedures.length === 0
        ? UNSPECIFIED_PROCEDURE_PROCEDURE_REQUIRED_ERROR
        : getSectionVirtualErrorMessage(procedureValidation, "procedure");
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
    isItemDisabled,
    requireProcedure,
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
    form.setValue(
      `item.${index}.procedure_sequence`,
      [...currentSequences, newSequence],
      USER_EDIT,
    );
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
                                  value,
                                  USER_EDIT,
                                );
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
                                  value ? value.toISOString() : undefined,
                                  USER_EDIT,
                                );
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
                        form.setValue(
                          "procedure",
                          updatedProcedures,
                          USER_EDIT,
                        );

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.procedure_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== procedure.sequence,
                          );
                          form.setValue(
                            `item.${itemIndex}.procedure_sequence`,
                            updatedSequences,
                            USER_EDIT,
                          );
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
                                    : [...field.value, value],
                                  USER_EDIT,
                                );
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
                                        ),
                                        USER_EDIT,
                                      );
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
  const isItemDisabled = form.watch(`item.${index}._is_disabled`);

  const {
    field: mandatoryCareTeamField,
    fieldState: mandatoryCareTeamFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_care_team_error` as any,
    control: form.control,
  });

  useEffect(() => {
    if (isItemDisabled) {
      syncVirtualFormErrorFromForm(
        form,
        `item.${index}._mandatory_care_team_error`,
        undefined,
      );
      return;
    }
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
    isItemDisabled,
  ]);

  const facilityId = form.getValues("facility");
  const { data: usersResponse, isLoading: loading } = useQuery({
    queryKey: ["facility-users", facilityId],
    queryFn: () => apis.user.facilityUsers(facilityId),
    enabled: isExpanded && !!facilityId,
  });

  const users = usersResponse?.results || [];

  const addNewCareTeamMember = () => {
    const currentCareTeam = form.getValues("care_team") || [];
    const newSequence =
      Math.max(0, ...currentCareTeam.map((m) => m.sequence)) + 1;
    const newCareTeamMember = {
      sequence: newSequence,
      provider: "",
      responsible: false,
      role: undefined,
    };

    form.setValue(
      "care_team",
      [...currentCareTeam, newCareTeamMember],
      USER_EDIT,
    );

    const currentSequences =
      form.getValues(`item.${index}.care_team_sequence`) || [];
    form.setValue(
      `item.${index}.care_team_sequence`,
      [...currentSequences, newSequence],
      USER_EDIT,
    );
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
  isResubmit,
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  claimUse: ClaimUseChoice | undefined;
  isResubmit?: boolean;
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
  const isItemDisabled = form.watch(`item.${index}._is_disabled`);

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
    if (isItemDisabled) {
      syncVirtualFormErrorFromForm(
        form,
        `item.${index}._mandatory_docs_error`,
        undefined,
      );
      return;
    }
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
    isItemDisabled,
  ]);

  useEffect(() => {
    if (isItemDisabled) {
      syncVirtualFormErrorFromForm(
        form,
        `item.${index}._mandatory_supporting_info_error`,
        undefined,
      );
      return;
    }
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
    isItemDisabled,
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

      const currentSequences =
        form.getValues(`item.${index}.information_sequence`) || [];
      form.setValue(
        `item.${index}.information_sequence`,
        [...currentSequences, newSequence],
        USER_EDIT,
      );

      form.setValue(
        "supporting_info",
        [
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
        ],
        USER_EDIT,
      );
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

    const currentSequences =
      form.getValues(`item.${index}.information_sequence`) || [];
    form.setValue(
      `item.${index}.information_sequence`,
      [...currentSequences, newSequence],
      USER_EDIT,
    );

    form.setValue(
      "supporting_info",
      [
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
      ],
      USER_EDIT,
    );
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
            const isLocked = info._locked === true && !isResubmit;

            return (
              <Card
                key={infoIndex}
                className={cn(
                  cardError && cardErrorBorderClass,
                  isLocked && "opacity-90",
                )}
              >
                <fieldset
                  disabled={isLocked}
                  className={cn(
                    "m-0 min-w-0 border-0 p-0",
                    isLocked && "pointer-events-none",
                  )}
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
                                  options={SUPPORTING_INFO_CODES.map(
                                    (code) => ({
                                      label: code.display,
                                      value: code.code,
                                    }),
                                  )}
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
                                      code,
                                      USER_EDIT,
                                    );
                                  }}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isLocked ? (
                        <Badge
                          variant="outline"
                          className="mt-1 shrink-0 gap-1 border-muted-foreground/30 text-muted-foreground"
                        >
                          <LockIcon className="h-3 w-3" />
                          From previous claim
                        </Badge>
                      ) : (
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
                            form.setValue(
                              "supporting_info",
                              updatedSupportingInfo,
                              USER_EDIT,
                            );

                            const items = form.getValues("item") || [];
                            items.forEach((item, itemIndex) => {
                              const currentSequences =
                                item.information_sequence || [];
                              const updatedSequences = currentSequences.filter(
                                (seq) => seq !== info.sequence,
                              );
                              form.setValue(
                                `item.${itemIndex}.information_sequence`,
                                updatedSequences,
                                USER_EDIT,
                              );
                            });
                          }}
                          className="mt-1"
                        >
                          <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                        </Button>
                      )}
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
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onChange={(value) => {
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.timing.start`,
                                    value ? value.toISOString() : undefined,
                                    USER_EDIT,
                                  );
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
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onChange={(value) => {
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.timing.end`,
                                    value ? value.toISOString() : undefined,
                                    USER_EDIT,
                                  );
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
                            <span className="text-red-500 text-sm ml-0.5">
                              *
                            </span>
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
                                    code,
                                    USER_EDIT,
                                  );
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
                      renderComment={() => (
                        <FormField
                          control={form.control}
                          name={`supporting_info.${mainInfoIndex}.value_string`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel>Comment</FormLabel>
                              <FormControl>
                                <Textarea
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    form.setValue(
                                      `supporting_info.${mainInfoIndex}.value_string`,
                                      e.target.value || undefined,
                                      USER_EDIT,
                                    );
                                  }}
                                  placeholder="Enter a comment"
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
                </fieldset>
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
  const attachment = form.watch(
    `supporting_info.${mainInfoIndex}.value_attachment`,
  );
  const attachmentPreviewUrl =
    attachment?.data && attachment?.content_type
      ? `data:${attachment.content_type};base64,${attachment.data}`
      : undefined;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAllowedUploadFile(file)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_UPLOAD_LABEL}.`);
      event.target.value = "";
      return;
    }
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_file`,
      file,
      USER_EDIT,
    );
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_string`,
      undefined,
      USER_EDIT,
    );
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_attachment`,
      undefined,
      USER_EDIT,
    );
    event.target.value = "";
  };

  const handleRemoveFile = () => {
    form.setValue(`supporting_info.${mainInfoIndex}.value_file`, undefined, USER_EDIT);
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_attachment`,
      undefined,
      USER_EDIT,
    );
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

              {!currentFile && attachmentPreviewUrl && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {attachment?.content_type?.includes("image") ? (
                      <img
                        src={attachmentPreviewUrl}
                        alt={attachment?.title || "attachment"}
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
                      href={attachmentPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary truncate hover:underline"
                    >
                      {attachment?.title || "Attachment"}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">Attachment</p>
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

              {!currentFile && !attachmentPreviewUrl && (
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
                        accept={ALLOWED_UPLOAD_ACCEPT}
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
