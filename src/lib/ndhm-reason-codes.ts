/** NDHM task reason codes — https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-reason-code */
export const NDHM_REASON_CODE_SYSTEM =
  "https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-reason-code";

export type NdhmReasonCodeOption = {
  code: string;
  display: string;
};

export const NDHM_REASON_CODES: readonly NdhmReasonCodeOption[] = [
  {
    code: "partialpayment",
    display: "Reprocess request due to partial payment by payer",
  },
  {
    code: "erroneousclaim",
    display: "Reprocess request due to erroneous claim submission by provider",
  },
  {
    code: "claimrejected",
    display: "Reprocess request due to claim rejected by payer",
  },
  {
    code: "referred",
    display: "Referred to another hospital",
  },
  {
    code: "erroneousregistration",
    display: "Beneficiary registered by mistakenly for a given policy",
  },
  {
    code: "wrongdiagnosis",
    display: "Additional facts were diagnosed during treatment.",
  },
  {
    code: "treatmentplanchanged",
    display: "Treatment plan changed during hospitalization.",
  },
] as const;

export const NDHM_CANCEL_REASON_CODES: readonly NdhmReasonCodeOption[] = [
  NDHM_REASON_CODES[3], // referred
  NDHM_REASON_CODES[4], // erroneousregistration
  NDHM_REASON_CODES[5], // wrongdiagnosis
  NDHM_REASON_CODES[6], // treatmentplanchanged
];

export const NDHM_REPROCESS_REASON_CODES: readonly NdhmReasonCodeOption[] = [
  NDHM_REASON_CODES[0], // partialpayment
  NDHM_REASON_CODES[1], // erroneousclaim
  NDHM_REASON_CODES[2], // claimrejected
];

export function toNdhmReasonCode(
  option: NdhmReasonCodeOption
): {
  system: string;
  code: string;
  display: string;
} {
  return {
    system: NDHM_REASON_CODE_SYSTEM,
    code: option.code,
    display: option.display,
  };
}
