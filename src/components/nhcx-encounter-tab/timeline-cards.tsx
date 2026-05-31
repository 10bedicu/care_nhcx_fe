import {
  AlertCircleIcon,
  ArrowRightIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  RotateCwIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { FC, ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  deriveClaimOutcome,
  deriveValidationOutcome,
  hasAuthRequirementsPurpose,
  hasValidationPurpose,
} from "./flow";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import ClaimCard from "../claim-encounter-tab/claim-card";
import CoverageEligibilityCard from "../coverage-encounter-tab/coverage-eligibility-card";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import {
  NDHM_CANCEL_REASON_CODES,
  NDHM_REPROCESS_REASON_CODES,
} from "@/lib/ndhm-reason-codes";
import { ReasonDialog } from "./reason-dialog";
import { apis } from "@/apis";
import { cn, toast } from "@/lib/utils";

// ─── shared helpers ──────────────────────────────────────────────────────────

interface BaseProps {
  encounterId: string;
  /** True when this card represents the latest record in the timeline. */
  isCurrent: boolean;
}

/** Linkable button rendered as either primary or secondary actions. */
function ActionButton({
  to,
  label,
  icon,
  variant = "default",
  size = "sm",
  onClick,
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
}) {
  const inner = (
    <>
      {icon}
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Button asChild variant={variant} size={size}>
        <a href={to}>{inner}</a>
      </Button>
    );
  }
  return (
    <Button variant={variant} size={size} onClick={onClick}>
      {inner}
    </Button>
  );
}

interface MenuItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
}

/**
 * Subtle banner that explains why no actions are available yet. Shown on the
 * latest card whenever we're still waiting on a payer response.
 */
function PendingResponseBanner({ message }: { message: string }) {
  return (
    <Alert className="border-yellow-300 bg-yellow-50 text-yellow-800">
      <ClockIcon className="h-4 w-4 text-yellow-600 animate-pulse" />
      <AlertTitle>Waiting for payer response</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ResponseErrorBanner({ message }: { message: string }) {
  return (
    <Alert className="border-red-300 bg-red-50 text-red-800">
      <XCircleIcon className="h-4 w-4 text-red-600" />
      <AlertTitle>Payer returned an error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
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
              item.destructive && "text-destructive hover:bg-destructive/10"
            );
            const inner = (
              <>
                {item.icon}
                <span>{item.label}</span>
              </>
            );
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

/** Build a `/claims/new` URL with the standard guided-flow query params. */
function buildClaimNewUrl({
  use,
  coverageEligibilityId,
  claimId,
  relatedClaimId,
}: {
  use: "claim" | "preauthorization";
  coverageEligibilityId?: string;
  /** Prefill source — latest claim on the encounter. Omit for a fresh pre-auth. */
  claimId?: string;
  /** FHIR related-claim linkage — latest claim with a successful payer response. */
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

/** Standard claim/related wiring used by all guided claim redirects. */
function standardClaimRedirectParams({
  latestClaimId,
  latestSuccessfulClaimId,
}: ClaimRedirectParams) {
  return {
    claimId: latestClaimId,
    relatedClaimId: latestSuccessfulClaimId,
  };
}

// ─── Coverage Eligibility actions ────────────────────────────────────────────

interface CoverageEligibilityTimelineCardProps extends BaseProps {
  request: CoverageEligibilityRequest;
  latestClaimId?: string;
  latestSuccessfulClaimId?: string;
}

export const CoverageEligibilityTimelineCard: FC<
  CoverageEligibilityTimelineCardProps
> = ({ request, isCurrent, latestClaimId, latestSuccessfulClaimId }) => {
  const isValidation = hasValidationPurpose(request);
  const isAuthRequirements = hasAuthRequirementsPurpose(request);
  const validationOutcome = isValidation
    ? deriveValidationOutcome(request)
    : null;
  const response = request.latest_response;

  let footerActions: ReactNode = null;
  let headerBanner: ReactNode = null;

  // ─── Hard-stop banner (always visible, even on historical cards) ───
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
  }

  // ─── Next-step state for the latest card ───
  if (isCurrent) {
    if (isValidation) {
      if (validationOutcome?.kind === "ok") {
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
              label="Start Pre-Auth"
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

// ─── Claim actions ───────────────────────────────────────────────────────────

interface ClaimTimelineCardProps extends BaseProps {
  claim: Claim;
  /** The most recent CE to wire as a query param when redirecting back to /coverages/new. */
  latestCoverageEligibilityId?: string;
  /** The most recent claim on the encounter — passed as the `claim` query param. */
  latestClaimId?: string;
  /** The most recent claim with a successful payer response — passed as `related`. */
  latestSuccessfulClaimId?: string;
}

export const ClaimTimelineCard: FC<ClaimTimelineCardProps> = ({
  claim,
  isCurrent,
  encounterId,
  latestCoverageEligibilityId,
  latestClaimId,
  latestSuccessfulClaimId,
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: apis.claim.cancel,
    onSuccess: () => {
      toast.success(
        claim.use === "preauthorization"
          ? "Pre-authorization cancelled"
          : "Claim cancelled"
      );
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
      setCancelOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel");
    },
  });

  const disputeMutation = useMutation({
    mutationFn: apis.claim.reprocess,
    onSuccess: () => {
      toast.success("Dispute raised successfully");
      queryClient.invalidateQueries({ queryKey: ["claims", encounterId] });
      setDisputeOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to raise dispute");
    },
  });

  const outcome = deriveClaimOutcome(claim);
  const isPreauth = claim.use === "preauthorization";
  const isClaim = claim.use === "claim";
  const isDispatchError = claim.dispatch_status === "error";

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

  if (isCurrent && outcome === "pending") {
    if (claim.dispatch_status === "error") {
      headerBanner = (
        <ResponseErrorBanner
          message={
            claim.dispatch_error ||
            "Failed to submit to the payer. Please try resubmitting."
          }
        />
      );
    } else {
      headerBanner = (
        <PendingResponseBanner
          message={
            isPreauth
              ? "Waiting for the payer to adjudicate this pre-authorisation. You can still cancel or check auth requirements while you wait."
              : "Waiting for the payer to adjudicate this claim. Next steps appear once a response arrives."
          }
        />
      );
    }
  }

  // Add more items + Cancel are available on the latest pre-authorization card
  // so the user can course-correct while waiting. Queried and cancelled records
  // skip Add more items; cancelled also skips Cancel.
  const preauthAlwaysExtras: MenuItem[] = [];
  if (isCurrent && isPreauth) {
    if (outcome !== "queried") {
      preauthAlwaysExtras.push({
        label: "Add more items",
        icon: <PlusCircleIcon className="h-4 w-4" />,
        to: `coverages/new?purpose=auth-requirements${ceQueryParam}`,
      });
    }
    if (outcome !== "cancelled") {
      preauthAlwaysExtras.push({
        label: "Cancel Pre-Auth",
        icon: <BanIcon className="h-4 w-4" />,
        onClick: () => setCancelOpen(true),
        destructive: true,
      });
    }
  }

  if (isCurrent && isPreauth) {
    if (outcome === "approved") {
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
        />,
      ];
      extraMenuItems = [
        {
          label: "Enhancement",
          icon: <PlusCircleIcon className="h-4 w-4" />,
          to: buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          }),
        },
        ...preauthAlwaysExtras,
      ];
    } else if (outcome === "partially-approved") {
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
        />,
      ];
      extraMenuItems = [
        {
          label: "Enhancement",
          icon: <PlusCircleIcon className="h-4 w-4" />,
          to: buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          }),
        },
        ...preauthAlwaysExtras,
      ];
    } else if (outcome === "rejected") {
      primaryActions = [
        <ActionButton
          key="resubmit"
          to={buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Resubmit"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
      extraMenuItems = [...preauthAlwaysExtras];
    } else if (outcome === "queried") {
      primaryActions = [
        <ActionButton
          key="resubmit"
          to={buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Resubmit"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
      extraMenuItems = [...preauthAlwaysExtras];
    } else if (outcome === "cancelled") {
      primaryActions = [
        <ActionButton
          key="raise-new"
          to={buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
          })}
          label="Raise new Pre-auth"
          icon={<PlusCircleIcon className="h-4 w-4" />}
        />,
      ];
      extraMenuItems = [...preauthAlwaysExtras];
    } else if (isDispatchError) {
      primaryActions = [
        <ActionButton
          key="retry"
          to={buildClaimNewUrl({
            use: "preauthorization",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Retry again"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
      extraMenuItems = [...preauthAlwaysExtras];
    } else {
      // Pending / unknown — no primary actions, but add-more-items + cancel are
      // still exposed via the always-extras list below.
      extraMenuItems = [...preauthAlwaysExtras];
    }
  }

  if (isCurrent && isClaim) {
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
    } else if (isDispatchError) {
      primaryActions = [
        <ActionButton
          key="retry"
          to={buildClaimNewUrl({
            use: "claim",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Retry again"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
    } else if (
      outcome === "partially-approved" ||
      outcome === "rejected"
    ) {
      primaryActions = [
        <ActionButton
          key="dispute"
          label="Dispute"
          icon={<AlertCircleIcon className="h-4 w-4" />}
          onClick={() => setDisputeOpen(true)}
          variant="outline"
        />,
      ];
    } else if (outcome === "queried") {
      primaryActions = [
        <ActionButton
          key="resubmit"
          to={buildClaimNewUrl({
            use: "claim",
            coverageEligibilityId: latestCoverageEligibilityId,
            ...claimRedirectParams,
          })}
          label="Resubmit"
          icon={<RotateCwIcon className="h-4 w-4" />}
        />,
      ];
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
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={
          isPreauth
            ? "Cancel Pre-Authorization"
            : "Cancel Claim"
        }
        description="Optionally choose an NDHM reason and add details. The cancellation will be sent to the payer."
        reasonLabel="Cancellation reason"
        descriptionLabel="Additional details"
        descriptionPlaceholder="e.g. Cancel preauth — patient discharged early"
        submitLabel="Confirm cancellation"
        variant="destructive"
        reasonCodes={NDHM_CANCEL_REASON_CODES}
        loading={cancelMutation.isPending}
        onSubmit={(body) =>
          cancelMutation.mutate({ id: claim.id, ...body })
        }
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
        onSubmit={(body) =>
          disputeMutation.mutate({ id: claim.id, ...body })
        }
      />
    </>
  );
};
