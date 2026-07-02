import {
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  HashIcon,
  Loader2Icon,
  MinusIcon,
  ScanLineIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UmbrellaIcon,
  UserIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PolicyIdentifierTab,
  PolicyLookupTabs,
} from "@/components/common/policy-lookup-tabs";
import { FC, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AbhaNumber } from "@/types/abha_number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { InlineLoading } from "@/components/common/loading-spinner";
import { Patient } from "@/types/patient";
import { Policy } from "@/types/policy";
import { VALIDATION_REUSE_WINDOW_HOURS } from "./constants";
import {
  formatVerificationTimestamp,
  isValidationStale,
} from "./utils";
import { apis } from "@/apis";
import { buildDemographicChecks } from "@/components/nhcx-encounter-tab/demographics";
import { deriveValidationOutcome } from "@/components/nhcx-encounter-tab/flow";
import { formatCurrency } from "@/lib/utils";
import { resolvePmjayMemberId } from "@/components/nhcx-encounter-tab/flow-prerequisites";
import { toast } from "sonner";

export type PolicyVerificationContext = {
  scope: "patient";
  patientId: string;
  facilityId: string;
};

type SearchParams = {
  identifiertype: "AbhaNumber" | "MobileNo" | "MemberId";
  identifiervalue: string;
};

/** Sequence offset for manually entered policies so they never collide with API-result indices. */
const MANUAL_POLICY_INDEX_OFFSET = 10_000;

type PolicyVerificationFormProps = {
  context: PolicyVerificationContext;
  className?: string;
  /** When true, selecting a policy creates and submits verification in one step. */
  skipSaveForVerification?: boolean;
  /** Hide the card title when rendered inside a sheet/dialog. */
  embedded?: boolean;
};

function listQueryKey(context: PolicyVerificationContext) {
  return [
    "coverage-eligibility-requests",
    context.scope,
    context.patientId,
  ] as const;
}

function buildCreatePayload(
  patientId: string,
  facilityId: string,
  policy: Policy,
) {
  return {
    status: "active" as const,
    priority: "normal" as const,
    purpose: ["validation" as const],
    facility: facilityId,
    patient: patientId,
    supporting_info: [],
    insurance: [{ sequence: 1, focal: true, policy }],
    item: [],
  };
}

export const PolicyVerificationForm: FC<PolicyVerificationFormProps> = ({
  context,
  className,
  skipSaveForVerification = false,
  embedded = false,
}) => {
  const { patientId, facilityId } = context;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PolicyIdentifierTab>("abha");
  const [mobileInput, setMobileInput] = useState("");
  const [memberIdInput, setMemberIdInput] = useState("");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [manualPolicies, setManualPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [verifyingPolicyKey, setVerifyingPolicyKey] = useState<string | null>(
    null,
  );

  const { data: abhaNumber, isFetching: isAbhaLoading } = useQuery({
    queryKey: ["abhaNumber", patientId],
    queryFn: () => apis.abhaNumber.get(patientId),
    enabled: !!patientId,
  });

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => apis.patient.get(patientId),
    enabled: !!patientId,
  });

  const { data: existingRequests, isFetching: isExistingLoading } = useQuery({
    queryKey: listQueryKey(context),
    queryFn: () =>
      apis.coverageEligibilityRequest.list({
        patient: patientId,
        purpose: "validation",
        ordering: "-created_date",
        unique_by_policy: true,
      }),
    enabled: !!patientId,
    refetchInterval: (query) => {
      const results = query.state.data?.results ?? [];
      return results.some(isAwaitingResponse) ? 5000 : false;
    },
  });

  const pmjayMemberId = patient ? resolvePmjayMemberId(patient) : undefined;

  useEffect(() => {
    if (abhaNumber?.mobile) {
      setMobileInput(abhaNumber.mobile);
    }
  }, [abhaNumber?.mobile]);

  useEffect(() => {
    if (pmjayMemberId) {
      setMemberIdInput(pmjayMemberId);
    }
  }, [pmjayMemberId]);

  useEffect(() => {
    if (activeTab === "abha" && abhaNumber?.abha_number) {
      setSearchParams({
        identifiertype: "AbhaNumber",
        identifiervalue: abhaNumber.abha_number.replace(/-/g, ""),
      });
    } else if (activeTab === "mobile" && abhaNumber?.mobile) {
      setSearchParams({
        identifiertype: "MobileNo",
        identifiervalue: abhaNumber.mobile,
      });
    } else if (activeTab !== "memberId") {
      setSearchParams(null);
    }
  }, [activeTab, abhaNumber]);

  const handleTabChange = (tab: PolicyIdentifierTab) => {
    setActiveTab(tab);
    setSearchParams(null);
  };

  const handleSearch = () => {
    if (activeTab === "mobile" && mobileInput) {
      setSearchParams({
        identifiertype: "MobileNo",
        identifiervalue: mobileInput,
      });
    } else if (activeTab === "memberId" && memberIdInput) {
      setSearchParams({
        identifiertype: "MemberId",
        identifiervalue: memberIdInput,
      });
    }
  };

  const { data: policies, isFetching: isPoliciesLoading } = useQuery({
    queryKey: ["policies", searchParams],
    queryFn: () => apis.gateway.policies(searchParams!),
    enabled: !!searchParams,
  });

  const invalidateSavedRequests = () => {
    queryClient.invalidateQueries({ queryKey: listQueryKey(context) });
  };

  const { mutate: createRequest, isPending: isCreating } = useMutation({
    mutationFn: apis.coverageEligibilityRequest.create,
    onSuccess: () => {
      toast.success("Policy saved for coverage verification");
      setSelectedPolicy(null);
      invalidateSavedRequests();
    },
    onError: () => {
      toast.error("Failed to save policy for coverage verification");
    },
  });

  const verifyPolicyInstantly = async (policy: Policy) => {
    const policyKey = `${policy.memberid}:${policy.payerid}:${policy.productid}`;
    setVerifyingPolicyKey(policyKey);
    try {
      const created = await apis.coverageEligibilityRequest.create(
        buildCreatePayload(patientId, facilityId, policy),
      );
      await apis.coverageEligibilityRequest.check(created.id);
      toast.success("Coverage verification submitted to payer");
      setSelectedPolicy(null);
      invalidateSavedRequests();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to verify policy with payer",
      );
    } finally {
      setVerifyingPolicyKey(null);
    }
  };

  const handlePolicySelect = (policy: Policy) => {
    if (skipSaveForVerification) {
      if (verifyingPolicyKey) return;
      void verifyPolicyInstantly(policy);
      return;
    }
    setSelectedPolicy(policy);
  };

  const handleSave = () => {
    if (!selectedPolicy) return;
    createRequest(buildCreatePayload(patientId, facilityId, selectedPolicy));
  };

  const pastVerifications = (existingRequests?.results ?? []).filter(
    (request) => {
      const isDraft = request.dispatch_status === "pending";
      const awaiting = isAwaitingResponse(request);
      const isOutdated = !isDraft && !awaiting && isValidationStale(request);
      return !isOutdated;
    },
  );

  const isVerifying = !!verifyingPolicyKey || isCreating;

  const lookupSection = (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center gap-2">
        <UmbrellaIcon className="size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Verify a policy</p>
          {skipSaveForVerification && (
            <p className="text-xs text-muted-foreground">
              Select a policy below to verify instantly with the payer.
            </p>
          )}
        </div>
      </div>

      <PolicyLookupTabs
        abhaValue={abhaNumber?.abha_number ?? ""}
        mobileValue={mobileInput}
        memberIdValue={memberIdInput}
        onMobileChange={setMobileInput}
        onMemberIdChange={setMemberIdInput}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSearch={handleSearch}
        isLoading={isPoliciesLoading || isAbhaLoading}
        onManualAdd={(policy) =>
          setManualPolicies((prev) => [...prev, policy])
        }
      />

      {(isPoliciesLoading || isExistingLoading) && (
        <InlineLoading label="Loading policies…" />
      )}

      <div className="grid gap-3 sm:grid-cols-2 min-w-0">
        {policies?.map((policy, index) => (
          <SelectablePolicyCard
            key={`api-${index}`}
            policy={policy}
            isSelected={
              !skipSaveForVerification && selectedPolicy?.sno === policy.sno
            }
            isVerifying={
              verifyingPolicyKey ===
              `${policy.memberid}:${policy.payerid}:${policy.productid}`
            }
            disabled={isVerifying}
            instantVerify={skipSaveForVerification}
            onSelect={() => handlePolicySelect(policy)}
          />
        ))}
        {manualPolicies.map((policy, index) => (
          <SelectablePolicyCard
            key={`manual-${MANUAL_POLICY_INDEX_OFFSET + index}`}
            policy={policy}
            isSelected={
              !skipSaveForVerification && selectedPolicy?.sno === policy.sno
            }
            isVerifying={
              verifyingPolicyKey ===
              `${policy.memberid}:${policy.payerid}:${policy.productid}`
            }
            disabled={isVerifying}
            instantVerify={skipSaveForVerification}
            onSelect={() => handlePolicySelect(policy)}
          />
        ))}
      </div>

      {!isPoliciesLoading &&
        !!searchParams &&
        policies?.length === 0 &&
        manualPolicies.length === 0 && (
          <p className="text-sm text-muted-foreground">No policies found</p>
        )}

      {!skipSaveForVerification && selectedPolicy && (
        <Button
          type="button"
          className="w-full"
          onClick={handleSave}
          disabled={isCreating}
        >
          {isCreating ? "Saving…" : "Save policy for verification"}
        </Button>
      )}
    </div>
  );

  const historySection =
    pastVerifications.length > 0 ? (
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Previous verifications
          </p>
          <p className="text-xs text-muted-foreground">
            Showing latest per policy
          </p>
        </div>
        {pastVerifications.map((request) => (
          <SavedVerificationCard
            key={request.id}
            request={request}
            patient={patient}
            abhaNumber={abhaNumber}
            onChanged={invalidateSavedRequests}
            skipSaveForVerification={skipSaveForVerification}
          />
        ))}
      </div>
    ) : null;

  const body = (
    <div className="space-y-6 min-w-0">
      {lookupSection}
      {historySection && (
        <>
          <div className="border-t" />
          {historySection}
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="p-3 bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheckIcon className="size-5 text-primary" />
          Policy Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-3">{body}</CardContent>
    </Card>
  );
};

/** True while a dispatched request is still awaiting a usable payer response. */
function isAwaitingResponse(request: CoverageEligibilityRequest): boolean {
  if (request.dispatch_status === "pending") return false;
  const response = request.latest_response;
  if (!response) return true;
  return response.outcome === "queued" || response.outcome === "partial";
}

type SavedVerificationCardProps = {
  request: CoverageEligibilityRequest;
  patient?: Patient;
  abhaNumber?: AbhaNumber;
  onChanged: () => void;
  skipSaveForVerification?: boolean;
};

const SavedVerificationCard: FC<SavedVerificationCardProps> = ({
  request,
  patient,
  abhaNumber,
  onChanged,
  skipSaveForVerification = false,
}) => {
  const focal =
    request.insurance.find((i) => i.focal) ?? request.insurance[0];
  const policyName = focal?.policy.productname ?? "Policy";

  const isDraft = request.dispatch_status === "pending";
  const awaiting = isAwaitingResponse(request);
  const outcome = deriveValidationOutcome(request);
  const response = request.latest_response;
  const primary =
    response?.insurances?.find((e) => e.is_primary) ??
    response?.insurances?.[0];
  const stale = !isDraft && !awaiting && isValidationStale(request);
  const verifiedAtLabel = formatVerificationTimestamp(request);

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: () => apis.coverageEligibilityRequest.check(request.id),
    onSuccess: () => {
      toast.success("Coverage check submitted to payer");
      onChanged();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit coverage check");
    },
  });

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: () => apis.coverageEligibilityRequest.remove(request.id),
    onSuccess: () => {
      toast.success("Policy removed");
      onChanged();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove policy");
    },
  });

  const balance =
    primary?.balance
      ? primary.balance.allowed.value - primary.balance.used.value
      : null;
  const demographicChecks =
    primary && (response?.outcome === "complete" || response?.outcome === "partial")
      ? buildDemographicChecks(primary, patient, abhaNumber)
      : [];

  return (
    <div
      className={`rounded-md border bg-card overflow-hidden min-w-0 ${
        stale ? "opacity-60 bg-muted/30 border-dashed" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0 space-y-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheckIcon
              className={`size-4 shrink-0 ${stale ? "text-muted-foreground" : "text-primary"}`}
            />
            <span className="truncate">{policyName}</span>
          </span>
          {!isDraft && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3 shrink-0" />
              {awaiting ? "Submitted" : "Verified"} {verifiedAtLabel}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {stale && (
            <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
              Outdated
            </Badge>
          )}
          {isDraft ? (
            <Badge variant="secondary" className="text-xs">
              Not submitted
            </Badge>
          ) : awaiting ? (
            <Badge variant="secondary" className="text-xs">
              Awaiting response
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={`text-xs ${
                stale
                  ? "bg-muted text-muted-foreground"
                  : outcome.kind === "ok"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {outcome.kind === "ok" ? "Verified" : "Attention"}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3">
        {stale && (
          <p className="text-xs text-muted-foreground">
            This result is older than {VALIDATION_REUSE_WINDOW_HOURS} hours and
            cannot be reused for claims. Verify the policy again above.
          </p>
        )}

        {isDraft && !skipSaveForVerification && (
          <>
            <p className="text-xs text-muted-foreground">
              Saved but not yet submitted. Submit to confirm the wallet balance
              and verify the patient's demographic details with the payer.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => submit()}
                disabled={isSubmitting || isRemoving}
              >
                {isSubmitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                {isSubmitting ? "Submitting…" : "Submit & verify"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => remove()}
                disabled={isSubmitting || isRemoving}
              >
                {isRemoving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
                Remove
              </Button>
            </div>
          </>
        )}

        {!isDraft && awaiting && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Waiting for the payer to confirm policy status, wallet balance and
            patient details.
          </p>
        )}

        {!isDraft && !awaiting && outcome.kind === "error" && (
          <p className="flex items-center gap-2 text-xs text-red-600">
            <XCircleIcon className="size-4" />
            {request.dispatch_error ||
              "The payer could not process this request. Try verifying again above."}
          </p>
        )}

        {!isDraft && !awaiting && primary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <WalletIcon className="size-4 text-primary" />
                Wallet balance
              </span>
              <span className="text-sm font-semibold">
                {balance !== null ? formatCurrency(balance) : "Not provided"}
              </span>
            </div>

            {primary.inforce === false && (
              <p className="flex items-center gap-2 text-xs text-red-600">
                <XCircleIcon className="size-4" />
                Policy is not active for this patient.
              </p>
            )}

            {demographicChecks.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <UserIcon className="size-3.5" />
                  Demographic check
                </p>
                <div className="divide-y rounded-md border text-sm">
                  {demographicChecks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center justify-between gap-2 px-3 py-1.5"
                    >
                      <span className="text-muted-foreground">
                        {check.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{check.received}</span>
                        {check.status === "match" ? (
                          <CheckCircle2Icon className="size-4 text-green-600" />
                        ) : check.status === "mismatch" ? (
                          <XCircleIcon className="size-4 text-red-600" />
                        ) : (
                          <MinusIcon className="size-4 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

type SelectablePolicyCardProps = {
  policy: Policy;
  isSelected: boolean;
  isVerifying?: boolean;
  disabled?: boolean;
  instantVerify?: boolean;
  onSelect: () => void;
};

const SelectablePolicyCard = ({
  policy,
  isSelected,
  isVerifying = false,
  disabled = false,
  instantVerify = false,
  onSelect,
}: SelectablePolicyCardProps) => (
  <Card
    className={`min-w-0 cursor-pointer transition-all duration-200 ${
      disabled && !isVerifying ? "opacity-60 pointer-events-none" : ""
    } ${
      instantVerify
        ? "hover:shadow-md hover:ring-1 hover:ring-primary/40"
        : "hover:bg-muted/50 hover:shadow-md"
    } ${
      isSelected ? "ring-2 ring-primary bg-primary/5" : ""
    } ${isVerifying ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
    onClick={disabled && !isVerifying ? undefined : onSelect}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <CardTitle className="text-base truncate">{policy.productname}</CardTitle>
        {isVerifying ? (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
        ) : isSelected ? (
          <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
        ) : instantVerify ? (
          <ShieldCheckIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : null}
      </div>
      {instantVerify && !isVerifying && (
        <p className="text-xs text-muted-foreground">Tap to verify</p>
      )}
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3 text-sm min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <HashIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">S.No</p>
            <p className="font-medium text-muted-foreground truncate">
              {policy.sno}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <ScanLineIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Product ID</p>
            <p className="font-medium text-muted-foreground truncate">
              {policy.productid}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <UserIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Member ID</p>
            <p className="font-medium text-muted-foreground truncate">
              {policy.memberid}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Payer ID</p>
            <p className="font-medium text-muted-foreground truncate">
              {policy.payerid}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
