import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  InfoIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
import { ChargeItem } from "@/types/charge_item";
import { chargeItemLabel } from "@/lib/prefill";
import { FileIcon, TrashIcon } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useController, useFieldArray } from "react-hook-form";

import Autocomplete from "../ui/autocomplete";
import { Badge } from "../ui/badge";
import BenefitSearchSelect from "../common/benefit-search-select";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Coding } from "@/types/base";
import { DateTimePicker } from "../ui/date-time-picker";
import { Input } from "../ui/input";
import { InsurancePlanSupportingInfoRequirement } from "@/types/insurance_plan";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import ValuesetSelect from "../common/valueset-select";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import { createClaimFormSchema } from "./schema";
import { AddQuestionnaireSection } from "./claim-questionnaire-section";
import { Claim, ClaimUseChoice } from "@/types/claim";
import {
  BenefitCostQualifierType,
  InsurancePlanBenefitDetail,
} from "@/types/insurance_plan";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

interface ClaimItemSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  coverageEligibilityRequest?: CoverageEligibilityRequest;
  previousClaim?: Claim;
  encounterChargeItems?: ChargeItem[];
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
      for (const seq of item.information_sequence ?? []) stillUsedInfoSeqs.add(seq);
      for (const seq of item.care_team_sequence ?? []) stillUsedCareTeamSeqs.add(seq);
      for (const seq of item.diagnosis_sequence ?? []) stillUsedDiagnosisSeqs.add(seq);
      for (const seq of item.procedure_sequence ?? []) stillUsedProcedureSeqs.add(seq);
    }

    const orphanedInfoSeqs = [...infoSeqs].filter((seq) => !stillUsedInfoSeqs.has(seq));
    if (orphanedInfoSeqs.length > 0) {
      form.setValue(
        "supporting_info",
        (form.getValues("supporting_info") ?? []).filter(
          (info) => !orphanedInfoSeqs.includes(info.sequence)
        )
      );
      form.setValue(
        "questionnaire_responses",
        (form.getValues("questionnaire_responses") ?? []).filter(
          (qr) => !orphanedInfoSeqs.includes(qr.sequence)
        )
      );
    }

    const orphanedCTSeqs = [...careTeamSeqs].filter((seq) => !stillUsedCareTeamSeqs.has(seq));
    if (orphanedCTSeqs.length > 0) {
      form.setValue(
        "care_team",
        (form.getValues("care_team") ?? []).filter(
          (ct) => !orphanedCTSeqs.includes(ct.sequence)
        )
      );
    }

    const orphanedDxSeqs = [...diagnosisSeqs].filter((seq) => !stillUsedDiagnosisSeqs.has(seq));
    if (orphanedDxSeqs.length > 0) {
      form.setValue(
        "diagnosis",
        (form.getValues("diagnosis") ?? []).filter(
          (dx) => !orphanedDxSeqs.includes(dx.sequence)
        )
      );
    }

    const orphanedProcSeqs = [...procedureSeqs].filter((seq) => !stillUsedProcedureSeqs.has(seq));
    if (orphanedProcSeqs.length > 0) {
      form.setValue(
        "procedure",
        (form.getValues("procedure") ?? []).filter(
          (proc) => !orphanedProcSeqs.includes(proc.sequence)
        )
      );
    }

    remove(index);
  };

  // Derive the insurance plan ID from the focal (or first) selected policy
  const selectedInsurances = form.watch("insurance");
  const focalPolicy =
    selectedInsurances?.find((i) => i.focal)?.policy ??
    selectedInsurances?.[0]?.policy;

  const { data: planListData } = useQuery({
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
  const hasSubmitted = form.formState.submitCount > 0;
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

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground flex items-start gap-2">
          <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <span>
            No items are attached yet. Items flow into this form from a
            coverage eligibility (auth requirements) request.
          </span>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const mandatoryDocsError =
            watchedItems?.[index]?._mandatory_docs_error;
          const amountCapError = watchedItems?.[index]?._amount_cap_error;
          const conditionErrors = watchedItems?.[index]?._condition_errors;
          const hasAnyError = mandatoryDocsError || amountCapError || conditionErrors;
          return (
          <Card
            className={cn(
              hasAnyError &&
                (hasSubmitted
                  ? "border-destructive ring-1 ring-destructive"
                  : "border-amber-400 ring-1 ring-amber-400")
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
                        <FormLabel>
                          Product or Service
                          <span className="text-red-500 text-sm ml-0.5">*</span>
                        </FormLabel>
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
                                }
                              );
                              form.setValue(`item.${index}.category`, {
                                system: BENEFIT_CATEGORY_SYSTEM,
                                code: benefit.coverage_type_code,
                                display: benefit.coverage_type_display,
                              });
                              const existing =
                                form.getValues(`item.${index}.program_code`) ??
                                [];
                              if (!existing.find((c) => c.code === "AB-PMJAY")) {
                                form.setValue(`item.${index}.program_code`, [
                                  ...existing,
                                  AB_PMJAY_CODE,
                                ]);
                              }
                            }}
                            disabled={isProductLocked}
                          />
                        </FormControl>
                        {isProductLocked && (
                          <p className="text-xs text-muted-foreground">
                            Product is locked. Remove this item and add a new one to change it.
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
            <CardContent className="space-y-4">
              <FormField
                key={field.id}
                control={form.control}
                name={`item.${index}.category`}
                render={({ field }) => {
                  const hasProduct = Boolean(
                    form.watch(`item.${index}.product_or_service`)?.code
                  );
                  return (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <ValuesetSelect
                          system="system-claim-item-category"
                          value={field.value}
                          onSelect={(value) => {
                            form.setValue(`item.${index}.category`, value);
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
                              (code) => code.code === value
                            );
                            if (!code) {
                              return;
                            }
                            form.setValue(
                              `item.${index}.program_code`,
                              field.value.map((c) => c.code).includes(code.code)
                                ? field.value
                                : [...field.value, code]
                            );
                          }}
                        />

                        {/* <ValuesetSelect
                          system="system-claim-program-code"
                          value={undefined}
                          onSelect={(value) => {
                            form.setValue(
                              `item.${index}.program_code`,
                              field.value
                                .map((c) => c.code)
                                .includes(value.code)
                                ? field.value
                                : [...field.value, value]
                            );
                          }}
                        /> */}

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
                                      (c) => c.code !== code.code
                                    )
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
                              value ? value.toISOString() : ""
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
                    <FormItem className="space-y-1.5">
                      <FormLabel>Service Period End</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={(value) => {
                            form.setValue(
                              `item.${index}.serviced_period.end`,
                              value ? value.toISOString() : undefined
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
                        <span className="text-red-500 text-sm ml-0.5">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value || ""}
                          onChange={(e) => {
                            form.setValue(
                              `item.${index}.quantity.value`,
                              e.target.value ? parseFloat(e.target.value) : 0
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
                            form.setValue(`item.${index}.quantity.unit`, value);
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
                        Auto-calculated from selected charge items (capped at benefit limit)
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
                                : undefined
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
            </CardContent>
            {hasAnyError && (
              <CardFooter
                className={cn(
                  "px-6 py-3 border-t flex-col items-start gap-2",
                  hasSubmitted
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-300 bg-amber-50"
                )}
              >
                {mandatoryDocsError && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium",
                      hasSubmitted ? "text-destructive" : "text-amber-700"
                    )}
                  >
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                    {mandatoryDocsError}
                  </div>
                )}
                {amountCapError && (
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                    {amountCapError}
                  </div>
                )}
                {conditionErrors && conditionErrors.split(" • ").map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm font-medium text-destructive"
                  >
                    <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
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
          <FormLabel>Modifier</FormLabel>
          <FormControl>
            <div className="grid gap-4">
              <Autocomplete
                options={qualifiers.map((q) => ({
                  label: q.display ? `${q.code} - ${q.display}` : q.code,
                  value: q.code,
                }))}
                value={undefined}
                onChange={(code) => {
                  const qualifier = qualifiers.find((q) => q.code === code);
                  if (!qualifier) return;
                  const existing = field.value ?? [];
                  if (existing.some((c) => c.code === qualifier.code)) return;
                  form.setValue(`item.${index}.modifier`, [
                    ...existing,
                    qualifier,
                  ]);
                }}
                disabled={!productCode || isLoading}
                placeholder={
                  !productCode
                    ? "Select a benefit first"
                    : isLoading
                      ? "Loading qualifiers…"
                      : qualifiers.length === 0
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
                {(field.value ?? []).map((code) => (
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
                          field.value.filter((c) => c.code !== code.code)
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
    [JSON.stringify(rawSelectedIds)]
  );

  const allItems = useMemo(
    () => rawAllItems ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawAllItems?.map((i) => i.charge_items))]
  );

  // Charge item IDs already claimed by other item rows
  const takenByOthers = useMemo(
    () =>
      new Set(
        allItems.flatMap((item, i) =>
          i !== index ? (item.charge_items ?? []) : []
        )
      ),
    [allItems, index]
  );

  const selectedChargeItems = useMemo(
    () =>
      selectedIds
        .map((id) => encounterChargeItems.find((ci) => ci.id === id))
        .filter((ci): ci is ChargeItem => !!ci),
    [selectedIds, encounterChargeItems]
  );

  const availableToAdd = useMemo(
    () =>
      encounterChargeItems.filter(
        (ci) => !selectedIds.includes(ci.id) && !takenByOthers.has(ci.id)
      ),
    [encounterChargeItems, selectedIds, takenByOthers]
  );

  const totalSelected = useMemo(
    () =>
      selectedChargeItems.reduce(
        (sum, ci) => sum + parseFloat(ci.total_price || "0"),
        0
      ),
    [selectedChargeItems]
  );

  if (encounterChargeItems.length === 0) return null;

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <ReceiptIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Charge Items</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIds.length}
            </Badge>
          )}
        </div>
        {selectedIds.length > 0 && !isExpanded && (
          <span className="text-sm text-muted-foreground">
            ₹{totalSelected.toFixed(2)}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 pl-4">
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
                ]);
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
                        selectedIds.filter((id) => id !== ci.id)
                      );
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
              No charge items selected. Select charge items to auto-calculate the unit price.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Given a loaded benefit detail, compute the cap amount considering selected modifiers.
 * Finds costs whose qualifiers are a subset of the selected modifiers. Among those,
 * returns the highest value. Falls back to limits[] and then max_limit_amount.
 */
function computeIpbCap(
  benefitDetail: InsurancePlanBenefitDetail,
  selectedModifierCodes: string[]
): number | null {
  const costs = benefitDetail.costs ?? [];
  if (costs.length > 0) {
    const matchingCosts = costs.filter((cost) => {
      if (cost.qualifiers.length === 0) return true;
      return cost.qualifiers.every((q) =>
        selectedModifierCodes.includes(q.qualifier_code)
      );
    });
    if (matchingCosts.length > 0) {
      const maxValue = Math.max(
        ...matchingCosts.map((c) => parseFloat(c.value_amount) || 0)
      );
      if (maxValue > 0) return maxValue;
    }
  }

  if (benefitDetail.limits?.length > 0) {
    const maxLimit = Math.max(
      ...benefitDetail.limits.map((l) => parseFloat(l.value_amount) || 0)
    );
    if (maxLimit > 0) return maxLimit;
  }

  const maxLimitAmount = parseFloat(benefitDetail.max_limit_amount);
  if (maxLimitAmount > 0) return maxLimitAmount;

  return null;
}

/**
 * Pure-side-effect component: watches item fields and sets virtual error fields
 * `_amount_cap_error` and `_condition_errors` in real time so errors are visible
 * before the user clicks submit.
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
  const itemSequence = form.watch(`item.${index}.sequence`);
  const claimUse = form.watch("use");

  const modifiers = useMemo(
    () => rawModifiers ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawModifiers)]
  );

  const chargeItemIds = useMemo(
    () => rawChargeItemIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawChargeItemIds)]
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

  // Compute the effective amount cap for this item based on the current stage
  const amountCap = useMemo(() => {
    if (claimUse === "preauthorization") {
      // Pre-auth: cap at CE:AR response item allowed_amount
      const insurances =
        coverageEligibilityRequest?.latest_response?.insurances;
      if (insurances) {
        const allItems = insurances.flatMap((ins) => ins.items ?? []);
        const matchedItem =
          allItems.find((item) => item.code === productCode) ??
          (allItems.length === 1 ? allItems[0] : undefined);
        if (matchedItem?.allowed_amount?.value != null) {
          return matchedItem.allowed_amount.value;
        }
      }
    } else if (claimUse === "claim") {
      // Claim: cap at pre-auth response item adjudication approved amount
      const responseItems = previousClaim?.latest_response?.item;
      if (responseItems && itemSequence) {
        const matched = responseItems.find(
          (ri) => ri.itemSequence === itemSequence
        );
        if (matched?.adjudication) {
          const benefitAdj = matched.adjudication.find((adj) =>
            adj.category?.coding?.some((c) =>
              ["benefit", "approved", "eligible"].includes(c.code ?? "")
            )
          );
          if (benefitAdj?.amount?.value != null) {
            return benefitAdj.amount.value;
          }
        }
      }
    }

    // Fallback: derive cap from IPB benefit detail (used for CE:AR stage too)
    if (benefitDetail) {
      return computeIpbCap(
        benefitDetail,
        modifiers.map((m) => m.code)
      );
    }
    return null;
  }, [
    claimUse,
    coverageEligibilityRequest,
    previousClaim,
    benefitDetail,
    productCode,
    itemSequence,
    modifiers,
  ]);

  // Sum total prices of all selected charge items
  const chargeItemsTotal = useMemo(() => {
    return chargeItemIds.reduce((sum, id) => {
      const ci = encounterChargeItems.find((c) => c.id === id);
      return sum + parseFloat(ci?.total_price ?? "0");
    }, 0);
  }, [chargeItemIds, encounterChargeItems]);

  // Auto-set unit_price = min(sum, cap); surface informational cap notice
  useEffect(() => {
    const capped =
      amountCap != null ? Math.min(chargeItemsTotal, amountCap) : chargeItemsTotal;
    form.setValue(`item.${index}.unit_price`, capped);

    if (amountCap != null && chargeItemsTotal > amountCap) {
      form.setValue(
        `item.${index}._amount_cap_error`,
        `Charge items total ₹${chargeItemsTotal.toFixed(2)} exceeds the allowed limit of ₹${amountCap.toFixed(2)}. Amount has been capped at ₹${amountCap.toFixed(2)}.`
      );
    } else {
      form.setValue(`item.${index}._amount_cap_error`, undefined);
    }
  }, [chargeItemsTotal, amountCap, form, index]);

  // Effect: set condition errors whenever quantity or modifiers change
  useEffect(() => {
    if (!benefitDetail?.conditions?.length) {
      form.setValue(`item.${index}._condition_errors`, undefined);
      return;
    }

    // Build a map of qualifier_code → qualifier_type for fast lookup
    const qualifierTypeMap = new Map<string, BenefitCostQualifierType>();
    for (const cost of benefitDetail.costs ?? []) {
      for (const q of cost.qualifiers) {
        qualifierTypeMap.set(q.qualifier_code, q.qualifier_type);
      }
    }

    const stratificationModifiers = modifiers.filter(
      (m) => qualifierTypeMap.get(m.code) === "stratification"
    );
    const implantModifiers = modifiers.filter(
      (m) => qualifierTypeMap.get(m.code) === "implant"
    );

    const errors: string[] = [];

    for (const cond of benefitDetail.conditions) {
      // Quantity
      if (cond.quantity_allowed > 0 && quantityValue > cond.quantity_allowed) {
        errors.push(
          `Quantity ${quantityValue} exceeds the allowed maximum of ${cond.quantity_allowed}`
        );
      }

      // Stratifications
      if (stratificationModifiers.length > 0) {
        if (!cond.stratification_allowed) {
          errors.push("Stratification is not allowed for this benefit");
        } else {
          if (
            !cond.multiple_stratification_allowed &&
            stratificationModifiers.length > 1
          ) {
            errors.push("Only one stratification is allowed");
          } else if (
            cond.maximum_stratification_allowed > 0 &&
            stratificationModifiers.length > cond.maximum_stratification_allowed
          ) {
            errors.push(
              `Maximum ${cond.maximum_stratification_allowed} stratification(s) allowed, ${stratificationModifiers.length} selected`
            );
          }
        }
      }

      // Implants
      if (implantModifiers.length > 0) {
        if (!cond.implant_applicable) {
          errors.push("Implants are not applicable for this benefit");
        } else {
          if (
            !cond.multiple_implants_allowed &&
            implantModifiers.length > 1
          ) {
            errors.push("Only one implant is allowed");
          } else if (
            cond.maximum_implants_allowed > 0 &&
            implantModifiers.length > cond.maximum_implants_allowed
          ) {
            errors.push(
              `Maximum ${cond.maximum_implants_allowed} implant(s) allowed, ${implantModifiers.length} selected`
            );
          }
        }
      }
    }

    form.setValue(
      `item.${index}._condition_errors`,
      errors.length > 0 ? errors.join(" • ") : undefined
    );
  }, [benefitDetail, quantityValue, modifiers, form, index]);

  return null;
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
  const { fields: diagnosisArrayFields, append: appendDiagnosis } =
    useFieldArray({
      name: "diagnosis",
      control: form.control,
    });

  const itemSpecificDiagnoses = diagnosisFields.filter((diagnosis) =>
    itemDiagnosisSequences.includes(diagnosis.sequence)
  );

  const addNewDiagnosis = () => {
    const newSequence =
      Math.max(0, ...diagnosisArrayFields.map((f) => f.sequence)) + 1;
    const newDiagnosis = {
      sequence: newSequence,
      type: [],
      diagnosis_reference: undefined,
      diagnosis_code: undefined,
      on_admission: undefined,
    };

    appendDiagnosis(newDiagnosis);

    const currentSequences =
      form.getValues(`item.${index}.diagnosis_sequence`) || [];
    form.setValue(`item.${index}.diagnosis_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
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
          {itemSpecificDiagnoses.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificDiagnoses.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificDiagnoses.map((diagnosis, diagnosisIndex) => {
            const mainDiagnosisIndex = diagnosisFields.findIndex(
              (d) => d.sequence === diagnosis.sequence
            );
            return (
              <Card key={diagnosisIndex}>
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
                                  value
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
                                  value as "yes" | "no" | "unknown" | undefined
                                );
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
                          (_, i) => i !== mainDiagnosisIndex
                        );
                        form.setValue("diagnosis", updatedDiagnoses);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.diagnosis_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== diagnosis.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.diagnosis_sequence`,
                            updatedSequences
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
                                    : [...field.value, value]
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
                                        `diagnosis.${mainDiagnosisIndex}.type`,
                                        field.value.filter(
                                          (c) => c.code !== code.code
                                        )
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
  const { fields: procedureArrayFields, append: appendProcedure } =
    useFieldArray({
      name: "procedure",
      control: form.control,
    });

  const itemSpecificProcedures = procedureFields.filter((procedure) =>
    itemProcedureSequences.includes(procedure.sequence)
  );

  const addNewProcedure = () => {
    const newSequence =
      Math.max(0, ...procedureArrayFields.map((f) => f.sequence)) + 1;
    const newProcedure = {
      sequence: newSequence,
      type: [],
      date: undefined,
      procedure_reference: undefined,
      procedure_code: undefined,
    };

    appendProcedure(newProcedure);

    const currentSequences =
      form.getValues(`item.${index}.procedure_sequence`) || [];
    form.setValue(`item.${index}.procedure_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span className="font-medium">Procedures</span>
          {itemSpecificProcedures.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificProcedures.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {itemSpecificProcedures.map((procedure, procedureIndex) => {
            const mainProcedureIndex = procedureFields.findIndex(
              (p) => p.sequence === procedure.sequence
            );
            return (
              <Card key={procedureIndex}>
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
                                  value
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
                                  value ? value.toISOString() : undefined
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
                          (_, i) => i !== mainProcedureIndex
                        );
                        form.setValue("procedure", updatedProcedures);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.procedure_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== procedure.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.procedure_sequence`,
                            updatedSequences
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
                                    : [...field.value, value]
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
                                          (c) => c.code !== code.code
                                        )
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
  const { fields: careTeamArrayFields, append: appendCareTeam } = useFieldArray(
    {
      name: "care_team",
      control: form.control,
    }
  );

  const itemSpecificCareTeam = careTeamFields.filter((member) =>
    itemCareTeamSequences.includes(member.sequence)
  );

  const facilityId = form.getValues("facility");
  const { data: usersResponse, isLoading: loading } = useQuery({
    queryKey: ["facility-users", facilityId],
    queryFn: () => apis.user.facilityUsers(facilityId),
    enabled: isExpanded && !!facilityId,
  });

  const users = usersResponse?.results || [];

  const addNewCareTeamMember = () => {
    const newSequence =
      Math.max(0, ...careTeamArrayFields.map((f) => f.sequence)) + 1;
    const newCareTeamMember = {
      sequence: newSequence,
      provider: "",
      responsible: false,
      role: undefined,
    };

    appendCareTeam(newCareTeamMember);

    const currentSequences =
      form.getValues(`item.${index}.care_team_sequence`) || [];
    form.setValue(`item.${index}.care_team_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50"
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
          {itemSpecificCareTeam.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificCareTeam.length}
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Loading facility users...
            </div>
          )}

          {itemSpecificCareTeam.map((member, memberIndex) => {
            const mainMemberIndex = careTeamFields.findIndex(
              (m) => m.sequence === member.sequence
            );
            return (
              <Card key={memberIndex}>
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
                                  value
                                );
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
                          (_, i) => i !== mainMemberIndex
                        );
                        form.setValue("care_team", updatedCareTeam);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.care_team_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== member.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.care_team_sequence`,
                            updatedSequences
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
                                  value
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
                                    checked as boolean
                                  );
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

  const { fields: supportingInfoArrayFields, append: appendSupportingInfo } =
    useFieldArray({
      name: "supporting_info",
      control: form.control,
    });

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
        (i) => i.items ?? []
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
    [allSupportingInfoRequirements]
  );

  const recommendedRequirements = useMemo(
    () => allSupportingInfoRequirements.filter((req) => !req.is_required),
    [allSupportingInfoRequirements]
  );

  const itemSpecificSupportingInfo = supportingInfoFields.filter((info) =>
    itemSupportingInfoSequences.includes(info.sequence)
  );

  // Auto-expand once when there is pre-filled supporting info for this item.
  useEffect(() => {
    if (itemSpecificSupportingInfo.length > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setIsExpanded(true);
    }
  }, [itemSpecificSupportingInfo.length]);

  type RequirementStatus = "satisfied" | "incomplete" | "missing";

  const getRequirementStatus = (
    req: InsurancePlanSupportingInfoRequirement
  ): RequirementStatus => {
    const matchingEntry = itemSpecificSupportingInfo.find(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (!matchingEntry) return "missing";
    const hasValue =
      matchingEntry.value_string ||
      matchingEntry.value_attachment ||
      matchingEntry.value_file;
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

  const unsatisfiedCount = requirementStatuses.filter(
    ({ status }) => status !== "satisfied"
  ).length;

  const {
    field: mandatoryDocsField,
    fieldState: mandatoryDocsFieldState,
  } = useController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `item.${index}._mandatory_docs_error` as any,
    control: form.control,
  });

  useEffect(() => {
    if (requiredRequirements.length > 0 && unsatisfiedCount > 0) {
      mandatoryDocsField.onChange(
        `${unsatisfiedCount} required document(s) must be uploaded before submitting`
      );
    } else {
      mandatoryDocsField.onChange(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandatoryDocsField.onChange, requiredRequirements.length, unsatisfiedCount]);

  const addSupportingInfoForRequirement = (
    req: InsurancePlanSupportingInfoRequirement
  ) => {
    const alreadyAdded = itemSpecificSupportingInfo.some(
      (info) =>
        info.category?.code === req.category_code &&
        info.code?.code === req.code_code
    );
    if (!alreadyAdded) {
      const currentQRSeqs = (form.getValues("questionnaire_responses") ?? []).map(
        (qr) => qr.sequence
      );
      const newSequence =
        Math.max(0, ...supportingInfoArrayFields.map((f) => f.sequence), ...currentQRSeqs) + 1;

      // Update information_sequence BEFORE appending to supporting_info so that
      // any intermediate render triggered by appendSupportingInfo already sees
      // the new sequence as item-linked (preventing it from flashing as plan-level).
      const currentSequences =
        form.getValues(`item.${index}.information_sequence`) || [];
      form.setValue(`item.${index}.information_sequence`, [
        ...currentSequences,
        newSequence,
      ]);

      appendSupportingInfo({
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
      });
    }
    if (!isExpanded) setIsExpanded(true);
  };

  const addNewSupportingInfo = () => {
    const currentQRSeqs = (form.getValues("questionnaire_responses") ?? []).map(
      (qr) => qr.sequence
    );
    const newSequence =
      Math.max(0, ...supportingInfoArrayFields.map((f) => f.sequence), ...currentQRSeqs) + 1;

    // Update information_sequence BEFORE appending to supporting_info (same
    // ordering rationale as addSupportingInfoForReq above).
    const currentSequences =
      form.getValues(`item.${index}.information_sequence`) || [];
    form.setValue(`item.${index}.information_sequence`, [
      ...currentSequences,
      newSequence,
    ]);

    appendSupportingInfo({
      sequence: newSequence,
      category: undefined as unknown as Coding,
      code: undefined as unknown as Coding,
      timing: undefined,
      value_string: undefined,
      value_attachment: undefined,
      _is_plan_level: false,
    });
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between cursor-pointer p-3 border rounded-lg hover:bg-muted/50",
          unsatisfiedCount > 0 && "border-amber-400 bg-amber-50/50"
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
          {itemSpecificSupportingInfo.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemSpecificSupportingInfo.length}
            </Badge>
          )}
          {unsatisfiedCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {unsatisfiedCount} doc{unsatisfiedCount > 1 ? "s" : ""} required
            </Badge>
          )}
        </div>
      </div>

      {(mandatoryDocsFieldState.error?.message || mandatoryDocsField.value) && (
        <p className="text-sm font-medium text-destructive px-1">
          {mandatoryDocsFieldState.error?.message || mandatoryDocsField.value}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4 pl-4">
          {/* Required Documents Panel */}
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
                        status === "incomplete" && "bg-amber-50 text-amber-800",
                        status === "missing" && "bg-amber-50 text-amber-800"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {status === "satisfied" ? (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
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
                          className="h-6 text-xs px-2 shrink-0 border-amber-300 bg-white hover:bg-amber-50"
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
                        <span className="text-xs text-amber-600 shrink-0 font-medium">
                          Upload required
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Documents Panel */}
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
                          "bg-blue-50 text-blue-800"
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
              (i) => i.sequence === info.sequence
            );
            const matchingRequirement = allSupportingInfoRequirements.find(
              (req) =>
                req.category_code === info.category?.code &&
                req.code_code === info.code?.code
            );
            const isRequiredDoc = Boolean(matchingRequirement?.is_required);

            return (
              <Card key={infoIndex}>
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
                                    : "border-blue-400 text-blue-700"
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
                                  field.value?.display ?? field.value?.code ?? ""
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
                                    (code) => code.code === value
                                  );
                                  if (!code) {
                                    return;
                                  }
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.code`,
                                    code
                                  );
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
                            (_, i) => i !== mainInfoIndex
                          );
                        form.setValue("supporting_info", updatedSupportingInfo);

                        const items = form.getValues("item") || [];
                        items.forEach((item, itemIndex) => {
                          const currentSequences =
                            item.information_sequence || [];
                          const updatedSequences = currentSequences.filter(
                            (seq) => seq !== info.sequence
                          );
                          form.setValue(
                            `item.${itemIndex}.information_sequence`,
                            updatedSequences
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
                                  value ? value.toISOString() : undefined
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
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(value) => {
                                form.setValue(
                                  `supporting_info.${mainInfoIndex}.timing.end`,
                                  value ? value.toISOString() : undefined
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
                                  })
                                )}
                                value={field.value?.code}
                                onChange={(value) => {
                                  const code = SUPPORTING_INFO_CATEGORIES.find(
                                    (code) => code.code === value
                                  );
                                  if (!code) {
                                    return;
                                  }
                                  form.setValue(
                                    `supporting_info.${mainInfoIndex}.category`,
                                    code
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
                                  : "text-blue-600"
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

                    <SupportingInfoFileUpload
                      form={form}
                      mainInfoIndex={mainInfoIndex}
                    />
                  </div>

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
                                e.target.value || undefined
                              );
                              form.setValue(
                                `supporting_info.${mainInfoIndex}.value_attachment`,
                                undefined
                              );
                            }}
                            placeholder="Enter supporting info value"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
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
    `supporting_info.${mainInfoIndex}.value_attachment`
  );

  const { data: existingFile } = useQuery({
    queryKey: ["file", attachmentId],
    queryFn: () => apis.file.get(attachmentId as string),
    enabled: !!attachmentId && !currentFile,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue(`supporting_info.${mainInfoIndex}.value_file`, file);
      form.setValue(`supporting_info.${mainInfoIndex}.value_string`, undefined);
    }
  };

  const handleRemoveFile = () => {
    form.setValue(`supporting_info.${mainInfoIndex}.value_file`, undefined);
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

              {!currentFile && existingFile?.read_signed_url && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex-shrink-0">
                    {/* Best-effort preview for images; otherwise show generic icon */}
                    {existingFile.extension &&
                    ["jpg", "jpeg", "png", "gif", "webp"].includes(
                      existingFile.extension.toLowerCase()
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
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
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
