import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  RotateCwIcon,
  SendIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { FC, ReactNode, useState } from "react";
import {
  NDHM_CANCEL_REASON_CODES,
  NDHM_REPROCESS_REASON_CODES,
} from "@/lib/ndhm-reason-codes";
import {
  isUnspecifiedProcedureCode,
  isUnspecifiedProcedureOnly,
} from "@/lib/benefit-item-validation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, toast } from "@/lib/utils";
import {
  deriveClaimOutcome,
  deriveValidationOutcome,
  getApprovalShortfallPercent,
  getClaimCopay,
  getReprocessDefaultAmount,
  hasAuthRequirementsPurpose,
  hasValidationPurpose,
  isEncounterDischarged,
  shouldOfferDispute,
} from "./flow";
import {
  buildDemographicChecks,
  getValidationDemographicEntry,
} from "./demographics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AbhaNumber } from "@/types/abha_number";
import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import ClaimCard from "../claim-encounter-tab/claim-card";
import { Coding } from "@/types/base";
import CoverageEligibilityCard from "../coverage-encounter-tab/coverage-eligibility-card";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { DemographicCheck } from "./demographics";
import { EncounterStatus } from "@/types/encounter";
import { InlineAttachment } from "@/types/file_upload";
import { Patient } from "@/types/patient";
import { ReasonDialog } from "./reason-dialog";
import { apis } from "@/apis";

interface BaseProps {
  encounterId: string;
  isCurrent: boolean;
}

function ActionButton({
  to,
  label,
  icon,
  variant = "default",
  size = "sm",
  onClick,
  disabled,
  tooltip,
}: {
  to?: string;
  label: ReactNode;
  icon?: ReactNode;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link";
  size?: "sm" | "default";
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: ReactNode;
}) {
  const inner = (
    <>
      {icon}
      <span>{label}</span>
    </>
  );

  let button: ReactNode;
  if (to && !disabled) {
    button = (
      <Button asChild variant={variant} size={size}>
        <a href={to}>{inner}</a>
      </Button>
    );
  } else {
    button = (
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
      >
        {inner}
      </Button>
    );
  }

  if (disabled && tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{button}</span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

interface MenuItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

function PendingResponseBanner({ message }: { message: string }) {
  return (
    <Alert className="border-yellow-300 bg-yellow-50 text-yellow-800">
      <ClockIcon className="text-yellow-600 animate-pulse" />
      <AlertTitle>Waiting for payer response</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ResponseErrorBanner({ message }: { message: string }) {
  return (
    <Alert className="border-red-300 bg-red-50 text-red-800">
      <XCircleIcon className="text-red-600" />
      <AlertTitle>Payer returned an error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function DemographicMismatchBanner({ checks }: { checks: DemographicCheck[] }) {
  return (
    <Alert className="border-red-300 bg-red-50 text-red-800">
      <BanIcon className="h-4 w-4 text-red-600" />
      <AlertTitle>Demographic verification failed</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          The patient's details on record do not match what the payer returned.
          Resolve the mismatch before proceeding with pre-authorisation or
          claims.
        </p>
        <div className="divide-y rounded-md border border-red-200 bg-white/60 text-sm">
          {checks.map((check) => (
            <div
              key={check.label}
              className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 px-3 py-1.5"
            >
              <span className="font-medium">{check.label}</span>
              <span className="text-xs">
                <span className="text-muted-foreground">Record: </span>
                {check.expected}
              </span>
              <span className="text-xs">
                <span className="text-muted-foreground">Payer: </span>
                {check.received}
              </span>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function MoreActionsMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="More actions">
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="flex flex-col">
          {items.map((item, idx) => {
            const className = cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-left",
              item.destructive && "text-destructive hover:bg-destructive/10",
              item.disabled &&
                "pointer-events-none cursor-not-allowed opacity-50 hover:bg-transparent",
            );
            const inner = (
              <>
                {item.icon}
                <span>{item.label}</span>
              </>
            );
            if (item.disabled) {
              const disabledItem = (
                <span className={className} aria-disabled="true">
                  {inner}
                </span>
              );
              if (!item.tooltip) {
                return <div key={idx}>{disabledItem}</div>;
              }
              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">{disabledItem}</div>
                    </TooltipTrigger>
                    <TooltipContent>{item.tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
            if (item.to) {
              return (
                <a
                  key={idx}
                  href={item.to}
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  {inner}
                </a>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                className={className}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildClaimNewUrl({
  use,
  coverageEligibilityId,
  claimId,
  relatedClaimId,
}: {
  use: "claim" | "preauthorization";
  coverageEligibilityId?: string;
  claimId?: string;
  relatedClaimId?: string;
}): string {
  const params = new URLSearchParams({ use });
  if (coverageEligibilityId) {
    params.set("coverage_eligibility", coverageEligibilityId);
  }
  if (claimId) {
    params.set("claim", claimId);
  }
  if (relatedClaimId) {
    params.set("related", relatedClaimId);
  }
  return `claims/new?${params.toString()}`;
}

interface ClaimRedirectParams {
  latestClaimId?: string;
  latestSuccessfulClaimId?: string;
}

function standardClaimRedirectParams({
  latestClaimId,
  latestSuccessfulClaimId,
}: ClaimRedirectParams) {
  return {
    claimId: latestClaimId,
    relatedClaimId: latestSuccessfulClaimId,
  };
}

interface CoverageEligibilityTimelineCardProps extends BaseProps {
  request: CoverageEligibilityRequest;
  latestClaimId?: string;
  latestSuccessfulClaimId?: string;
  afterCeValidationSatisfied?: boolean;
  patient?: Patient;
  abhaNumber?: AbhaNumber;
  isChild?: boolean;
}

export const CoverageEligibilityTimelineCard: FC<
  CoverageEligibilityTimelineCardProps
> = ({
  request,
  encounterId,
  isCurrent,
  latestClaimId,
  latestSuccessfulClaimId,
  afterCeValidationSatisfied = true,
  patient,
  abhaNumber,
  isChild = false,
}) => {
  const queryClient = useQueryClient();
  const submitMutation = useMutation({
    mutationFn: (id: string) => apis.coverageEligibilityRequest.check(id),
    onSuccess: () => {
      toast.success("Coverage check submitted to payer");
      queryClient.invalidateQueries({
        queryKey: ["coverage-eligibility-requests", encounterId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit coverage check");
    },
  });

  const isValidation = hasValidationPurpose(request);
  const isAuthRequirements = hasAuthRequirementsPurpose(request);
  const validationOutcome = isValidation
    ? deriveValidationOutcome(request)
    : null;
  const response = request.latest_response;

  const demographicEntry =
    isValidation && !isChild
      ? getValidationDemographicEntry(request)
      : undefined;
  const demographicChecks = demographicEntry
    ? buildDemographicChecks(demographicEntry, patient, abhaNumber)
    : [];
  const hasDemographicConflict =
    validationOutcome?.kind === "ok" &&
    demographicChecks.some((check) => check.status === "mismatch");

  let footerActions: ReactNode = null;
  let headerBanner: ReactNode = null;

  if (
    validationOutcome?.kind === "policy-inactive" ||
    validationOutcome?.kind === "no-balance"
  ) {
    headerBanner = (
      <Alert className="border-red-300 bg-red-50 text-red-800">
        <BanIcon className="h-4 w-4 text-red-600" />
        <AlertTitle>Hard stop</AlertTitle>
        <AlertDescription>{validationOutcome.message}</AlertDescription>
      </Alert>
    );
  } else if (hasDemographicConflict) {
    headerBanner = (
      <DemographicMismatchBanner
        checks={demographicChecks.filter((c) => c.status === "mismatch")}
      />
    );
  }

  if (isCurrent) {
    if (isValidation) {
      if (
        validationOutcome?.kind === "ok" &&
        afterCeValidationSatisfied &&
        !hasDemographicConflict
      ) {
        footerActions = (
          <ActionButton
            to={`coverages/new?purpose=auth-requirements&coverage_eligibility=${request.id}`}
            label="Check Auth Requirements"
            icon={<ShieldAlertIcon className="h-4 w-4" />}
          />
        );
      } else if (validationOutcome?.kind === "pending") {
        if (request.dispatch_status === "error") {
          headerBanner = (
            <ResponseErrorBanner
              message={
                request.dispatch_error ||
                "Failed to submit to the payer. Please try resubmitting."
              }
            />
          );
        } else if (request.dispatch_status === "pending") {
          footerActions = (
            <ActionButton
              label={
                submitMutation.isPending ? "Submitting…" : "Submit to Payer"
              }
              icon={<SendIcon className="h-4 w-4" />}
              onClick={() => submitMutation.mutate(request.id)}
              disabled={submitMutation.isPending}
            />
          );
        } else {
          headerBanner = (
            <PendingResponseBanner message="Waiting for the payer to confirm policy status and wallet balance. Next steps appear once the response arrives." />
          );
        }
      } else if (validationOutcome?.kind === "error") {
        headerBanner = (
          <ResponseErrorBanner message="The payer responded with an error. Try running coverage validation again." />
        );
      }
    } else if (isAuthRequirements) {
      if (!response) {
        if (request.dispatch_status === "error") {
          headerBanner = (
            <ResponseErrorBanner
              message={
                request.dispatch_error ||
                "Failed to submit to the payer. Please try resubmitting."
              }
            />
          );
        } else {
          headerBanner = (
            <PendingResponseBanner message="Waiting for the payer to return the documents and questionnaires required for pre-authorisation." />
          );
        }
      } else if (response.outcome === "complete") {
        footerActions = (
          <>
            <ActionButton
              to={`coverages/new?purpose=auth-requirements&coverage_eligibility=${request.id}`}
              label="Add more items"
              icon={<PlusCircleIcon className="h-4 w-4" />}
              variant="outline"
            />
            <ActionButton
              to={buildClaimNewUrl({
                use: "preauthorization",
                coverageEligibilityId: request.id,
                ...standardClaimRedirectParams({
                  latestClaimId,
                  latestSuccessfulClaimId,
                }),
              })}
              label="Start Pre-Authorization"
              icon={<ArrowRightIcon className="h-4 w-4" />}
            />
          </>
        );
      } else if (response.outcome === "error") {
        headerBanner = (
          <ResponseErrorBanner message="The payer could not return the auth requirements. Try again or contact the payer." />
        );
      } else {
        // queued / partial — still waiting for finalised data
        headerBanner = (
          <PendingResponseBanner message="The payer is still preparing the auth requirements response." />
        );
      }
    }
  }

  return (
    <CoverageEligibilityCard
      coverageEligibilityRequest={request}
      footerActions={footerActions}
      headerBanner={headerBanner}
    />
  );
};

interface ClaimTimelineCardProps extends BaseProps {
  claim: Claim;
  latestCoverageEligibilityId?: string;
  latestClaimId?: string;
  latestSuccessfulClaimId?: string;
  encounterStatus: EncounterStatus;
  walletRemaining?: number | null;
}

export const ClaimTimelineCard: FC<ClaimTimelineCardProps> = ({
  claim,
  isCurrent,
  encounterId,
  latestCoverageEligibilityId,
  latestClaimId,
  latestSuccessfulClaimId,
  encounterStatus,
  walletRemaining = null,
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { reason_code?: Coding; description?: string };
    }) => apis.claim.cancel(id, body),
    onSuccess: () => {
      toast.success(
        claim.use === "preauthorization"
          ? "Pre-authorization cancelled"
          : "Claim cancelled",
      );
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
      setCancelOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel");
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        reason_code?: Coding;
        description?: string;
        amount?: { value: number; currency: string };
        attachment?: InlineAttachment;
      };
    }) => apis.claim.reprocess(id, body),
    onSuccess: () => {
      toast.success("Dispute raised successfully");
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", claim.id] });
      setDisputeOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to raise dispute");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => apis.claim.submit(id),
    onSuccess: () => {
      toast.success(
        claim.use === "preauthorization"
          ? "Pre-authorization submitted"
          : "Claim submitted",
      );
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit");
    },
  });

  const outcome = deriveClaimOutcome(claim);
  const isPreauth = claim.use === "preauthorization";
  const isClaim = claim.use === "claim";
  const useLabel = isPreauth ? "Pre-Authorization" : "Claim";
  const isUnspecifiedOnly = isUnspecifiedProcedureOnly(claim.item ?? [], (it) =>
    isUnspecifiedProcedureCode(it.product_or_service?.code),
  );
  const dispatchStatus = claim.dispatch_status;

  const copay = getClaimCopay(claim, walletRemaining);
  const approvalShortfallPercent = getApprovalShortfallPercent(claim);

  const { data: claimTasks } = useQuery({
    queryKey: ["tasks", claim.id],
    queryFn: () => apis.claim.tasks(claim.id),
    enabled: isCurrent && isClaim,
  });
  const hasReprocessRequest = (claimTasks?.results ?? []).some(
    (task) =>
      task.use_case === "reprocess_request" && task.dispatch_status !== "error",
  );

  const ceQueryParam = latestCoverageEligibilityId
    ? `&coverage_eligibility=${latestCoverageEligibilityId}`
    : "";

  const claimRedirectParams = standardClaimRedirectParams({
    latestClaimId,
    latestSuccessfulClaimId,
  });

  let primaryActions: ReactNode[] = [];
  let extraMenuItems: MenuItem[] = [];
  let headerBanner: ReactNode = null;

  const preauthCancelDisabled = isEncounterDischarged(encounterStatus);
  const preauthCancelMenuItem: MenuItem | undefined =
    isCurrent && isPreauth && outcome !== "cancelled"
      ? {
          label: "Cancel Pre-Authorization",
          icon: <BanIcon className="h-4 w-4" />,
          onClick: () => setCancelOpen(true),
          destructive: true,
          disabled: preauthCancelDisabled,
          tooltip: preauthCancelDisabled
            ? "Pre-authorization cannot be cancelled after the patient is discharged."
            : undefined,
        }
      : undefined;

  const preauthResponseExtras: MenuItem[] = [];
  if (isCurrent && isPreauth) {
    if (outcome !== "queried") {
      const enhancementModeParam = latestSuccessfulClaimId
        ? "&mode=enhancement"
        : "";
      if (!isUnspecifiedOnly) {
        preauthResponseExtras.push({
          label: "Update Items as Enhancement",
          icon: <PlusCircleIcon className="h-4 w-4" />,
          to: `coverages/new?purpose=auth-requirements${enhancementModeParam}${ceQueryParam}`,
        });
      }
      preauthResponseExtras.push({
        label: "Update Items as Resubmit",
        icon: <PlusCircleIcon className="h-4 w-4" />,
        to: `coverages/new?purpose=auth-requirements&mode=resubmit${ceQueryParam}`,
      });
    }
    if (preauthCancelMenuItem) {
      preauthResponseExtras.push(preauthCancelMenuItem);
    }
  }

  const submitAction = (
    <ActionButton
      key="submit"
      label={
        submitMutation.isPending
          ? "Submitting…"
          : isPreauth
            ? "Submit Pre-Authorization"
            : "Submit Claim"
      }
      icon={<SendIcon className="h-4 w-4" />}
      onClick={() => submitMutation.mutate(claim.id)}
      disabled={submitMutation.isPending}
    />
  );

  if (isCurrent && (isPreauth || isClaim)) {
    if (outcome === "cancelled") {
      if (isPreauth) {
        primaryActions = [
          <ActionButton
            key="raise-auth-requirements"
            to={`coverages/new?purpose=auth-requirements${ceQueryParam}`}
            label="Raise new Auth Requirements"
            icon={<ShieldAlertIcon className="h-4 w-4" />}
            variant="outline"
          />,
          <ActionButton
            key="raise-new"
            to={buildClaimNewUrl({
              use: "preauthorization",
              coverageEligibilityId: latestCoverageEligibilityId,
            })}
            label="Raise new Pre-Authorization"
            icon={<PlusCircleIcon className="h-4 w-4" />}
          />,
        ];
      }
    } else if (dispatchStatus === "pending") {
      primaryActions = [submitAction];
    } else if (dispatchStatus === "awaiting") {
      headerBanner = (
        <PendingResponseBanner
          message={
            isPreauth
              ? "Waiting for the payer to adjudicate this pre-authorisation."
              : "Waiting for the payer to adjudicate this claim."
          }
        />
      );
      if (preauthCancelMenuItem) {
        extraMenuItems = [preauthCancelMenuItem];
      }
    } else if (dispatchStatus === "error") {
      headerBanner = (
        <ResponseErrorBanner
          message={
            claim.dispatch_error ||
            "Failed to submit to the payer. Please try resubmitting."
          }
        />
      );
      primaryActions = [
        <ActionButton
          key="retry"
          to={buildClaimNewUrl({
            use: isPreauth ? "preauthorization" : "claim",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Retry Again"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
      if (isPreauth) {
        extraMenuItems = [...preauthResponseExtras];
      }
    } else {
      if (isPreauth) {
        if (outcome === "approved" || outcome === "partially-approved") {
          const patientDischarged = isEncounterDischarged(encounterStatus);
          primaryActions = [
            <ActionButton
              key="claim"
              to={buildClaimNewUrl({
                use: "claim",
                coverageEligibilityId: latestCoverageEligibilityId,
                ...claimRedirectParams,
              })}
              label="Proceed to Claim"
              icon={<ArrowRightIcon className="h-4 w-4" />}
              disabled={!patientDischarged}
              tooltip="The patient must be discharged before a claim can be raised."
            />,
          ];
          extraMenuItems = [
            ...(isUnspecifiedOnly
              ? []
              : [
                  {
                    label: `Update ${useLabel}`,
                    icon: <PlusCircleIcon className="h-4 w-4" />,
                    to: buildClaimNewUrl({
                      use: "preauthorization",
                      coverageEligibilityId: latestCoverageEligibilityId,
                      ...claimRedirectParams,
                    }),
                  },
                ]),
            ...preauthResponseExtras,
          ];
        } else if (outcome === "rejected" || outcome === "queried") {
          primaryActions = [
            <ActionButton
              key="resubmit"
              to={buildClaimNewUrl({
                use: "preauthorization",
                coverageEligibilityId: latestCoverageEligibilityId,
                ...claimRedirectParams,
              })}
              label={outcome === "queried" ? "Respond to Query" : "Resubmit"}
              icon={<RotateCwIcon className="h-4 w-4" />}
            />,
          ];
          extraMenuItems = [...preauthResponseExtras];
        } else {
          headerBanner = (
            <PendingResponseBanner message="The payer has acknowledged the request but has not yet returned a final adjudication." />
          );
          extraMenuItems = [...preauthResponseExtras];
        }
      } else if (isClaim) {
        if (outcome === "approved") {
          primaryActions = [
            <span
              key="approved"
              className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200"
            >
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              Claim Approved
            </span>,
          ];
        } else if (outcome === "partially-approved" || outcome === "rejected") {
          if (shouldOfferDispute(claim)) {
            primaryActions = [
              <ActionButton
                key="dispute"
                label="Dispute"
                icon={<AlertCircleIcon className="h-4 w-4" />}
                onClick={() => setDisputeOpen(true)}
                variant="outline"
                disabled={hasReprocessRequest}
                tooltip={
                  hasReprocessRequest
                    ? "A reprocess request has already been raised for this claim."
                    : undefined
                }
              />,
            ];
          }
        } else if (outcome === "queried") {
          primaryActions = [
            <ActionButton
              key="resubmit"
              to={buildClaimNewUrl({
                use: "claim",
                coverageEligibilityId: latestCoverageEligibilityId,
                ...claimRedirectParams,
              })}
              label="Respond to Query"
              icon={<RotateCwIcon className="h-4 w-4" />}
            />,
          ];
        } else {
          // outcome === "pending" under partial dispatch — wait.
          headerBanner = (
            <PendingResponseBanner message="The payer has acknowledged the claim but has not yet returned a final adjudication." />
          );
        }
      }
    }
  }

  const footerActions = (
    <>
      {primaryActions.map((node, i) => (
        <span key={i}>{node}</span>
      ))}
      {extraMenuItems.length > 0 && <MoreActionsMenu items={extraMenuItems} />}
    </>
  );

  return (
    <>
      <ClaimCard
        claim={claim}
        footerActions={footerActions}
        headerBanner={headerBanner}
        copay={copay}
        approvalShortfallPercent={approvalShortfallPercent}
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={isPreauth ? "Cancel Pre-Authorization" : "Cancel Claim"}
        description="Optionally choose an NDHM reason and add details. The cancellation will be sent to the payer."
        reasonLabel="Cancellation reason"
        descriptionLabel="Additional details"
        descriptionPlaceholder="e.g. Cancel pre-authorization — patient discharged early"
        submitLabel="Confirm cancellation"
        variant="destructive"
        reasonCodes={NDHM_CANCEL_REASON_CODES}
        loading={cancelMutation.isPending}
        onSubmit={(body) => cancelMutation.mutate({ id: claim.id, body })}
      />
      <ReasonDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        title="Raise Dispute"
        description="Optionally choose an NDHM reason and add details so the payer can re-adjudicate."
        reasonLabel="Dispute reason"
        descriptionLabel="Additional details"
        descriptionPlaceholder="e.g. Procedure incorrectly rejected, supporting documents attached"
        submitLabel="Send dispute"
        reasonCodes={NDHM_REPROCESS_REASON_CODES}
        loading={disputeMutation.isPending}
        showAmount
        amountLabel="Disputed amount (₹)"
        defaultAmount={getReprocessDefaultAmount(claim)}
        showAttachment
        attachmentLabel="Supporting document"
        encounterId={encounterId}
        onSubmit={(body) => disputeMutation.mutate({ id: claim.id, body })}
      />
    </>
  );
};
