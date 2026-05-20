import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  PaperclipIcon,
  PlusIcon,
  ShoppingBasketIcon,
  XIcon,
} from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

interface ClaimItemSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
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

export function ClaimItemSection({ form }: ClaimItemSectionProps) {
  const { fields, append, remove } = useFieldArray({
    name: "item",
    control: form.control,
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingBasketIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Add claim items</h3>
          <p className="text-sm text-muted-foreground">
            Add all applicable items to the claim.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const mandatoryDocsError =
            watchedItems?.[index]?._mandatory_docs_error;
          return (
          <Card
            className={cn(
              mandatoryDocsError &&
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
                render={({ field }) => (
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        remove(index);
                      }}
                      className="mt-6"
                    >
                      <CircleMinusIcon className="h-6 w-6 text-danger-500" />
                    </Button>
                  </div>
                )}
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

              <AddDiagnosisSection form={form} index={index} />
              <AddProcedureSection form={form} index={index} />
              <AddCareTeamSection form={form} index={index} />
              <AddSupportingInfoSection
                form={form}
                index={index}
                planId={planId}
              />
              <AddQuestionnaireSection
                form={form}
                index={index}
                planId={planId}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`item.${index}.serviced_period.start`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Service Period Start</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={(value) => {
                            form.setValue(
                              `item.${index}.serviced_period.start`,
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
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            form.setValue(
                              `item.${index}.unit_price`,
                              e.target.value ? parseFloat(e.target.value) : 0
                            );
                          }}
                          placeholder="Enter unit price"
                        />
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
            {mandatoryDocsError && (
              <CardFooter
                className={cn(
                  "px-6 py-3 border-t",
                  hasSubmitted
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-300 bg-amber-50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    hasSubmitted ? "text-destructive" : "text-amber-700"
                  )}
                >
                  <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
                  {mandatoryDocsError}
                </div>
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
              <FormLabel />
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    append({
                      sequence: (fields[fields.length - 1]?.sequence ?? 0) + 1,
                      care_team_sequence: [],
                      diagnosis_sequence: [],
                      procedure_sequence: [],
                      information_sequence: [],
                      modifier: [],
                      program_code: [],
                      quantity: {
                        value: 0,
                      },
                      unit_price: 0,
                    })
                  }
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Item
                </Button>
              </FormControl>
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
      (diagnosisArrayFields[diagnosisArrayFields.length - 1]?.sequence ?? 0) +
      1;
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
          <span className="font-medium">Diagnoses</span>
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
      (procedureArrayFields[procedureArrayFields.length - 1]?.sequence ?? 0) +
      1;
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
      (careTeamArrayFields[careTeamArrayFields.length - 1]?.sequence ?? 0) + 1;
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
          <span className="font-medium">Care Team</span>
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
}: {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
  index: number;
  planId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const allSupportingInfoRequirements = useMemo(() => {
    const all = benefitDetail?.supporting_info_requirements ?? [];
    // Filter out questionnaire-based requirements (those with a documentation_url)
    const filtered = all.filter((req) => !req.documentation_url);
    // Deduplicate by category_code + code_code
    const seen = new Set<string>();
    return filtered.filter((req) => {
      const key = `${req.category_code}:${req.code_code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [benefitDetail]);

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

  const requirementStatuses = useMemo(
    () =>
      requiredRequirements.map((req) => ({
        req,
        status: getRequirementStatus(req),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredRequirements, itemSpecificSupportingInfo]
  );

  const recommendedStatuses = useMemo(
    () =>
      recommendedRequirements.map((req) => ({
        req,
        status: getRequirementStatus(req),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recommendedRequirements, itemSpecificSupportingInfo]
  );

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
      const newSequence =
        (supportingInfoArrayFields[supportingInfoArrayFields.length - 1]
          ?.sequence ?? 0) + 1;
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
      });
      const currentSequences =
        form.getValues(`item.${index}.information_sequence`) || [];
      form.setValue(`item.${index}.information_sequence`, [
        ...currentSequences,
        newSequence,
      ]);
    }
    if (!isExpanded) setIsExpanded(true);
  };

  const addNewSupportingInfo = () => {
    const newSequence =
      (supportingInfoArrayFields[supportingInfoArrayFields.length - 1]
        ?.sequence ?? 0) + 1;
    appendSupportingInfo({
      sequence: newSequence,
      category: undefined as unknown as Coding,
      code: undefined as unknown as Coding,
      timing: undefined,
      value_string: undefined,
      value_attachment: undefined,
    });

    const currentSequences =
      form.getValues(`item.${index}.information_sequence`) || [];
    form.setValue(`item.${index}.information_sequence`, [
      ...currentSequences,
      newSequence,
    ]);
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
