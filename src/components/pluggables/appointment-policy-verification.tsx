import {
  Building2Icon,
  CheckCircle2Icon,
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
import { apis } from "@/apis";
import { buildDemographicChecks } from "@/components/nhcx-encounter-tab/demographics";
import { deriveValidationOutcome } from "@/components/nhcx-encounter-tab/flow";
import { formatCurrency } from "@/lib/utils";
import { resolvePmjayMemberId } from "@/components/nhcx-encounter-tab/flow-prerequisites";
import { toast } from "sonner";

/**
 * Props provided by the care_fe `AppointmentActions` plugin slot. Only the
 * fields used here are typed; the host passes the full appointment object.
 */
type AppointmentActionsProps = {
  appointment: { id: string };
  patientId: string;
  facilityId: string;
  encounterId?: string;
  className?: string;
};

type SearchParams = {
  identifiertype: "AbhaNumber" | "MobileNo" | "MemberId";
  identifiervalue: string;
};

/** Sequence offset for manually entered policies so they never collide with API-result indices. */
const MANUAL_POLICY_INDEX_OFFSET = 10_000;

const AppointmentPolicyVerification: FC<AppointmentActionsProps> = ({
  appointment,
  patientId,
  facilityId,
  encounterId,
  className,
}) => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PolicyIdentifierTab>("abha");
  const [mobileInput, setMobileInput] = useState("");
  const [memberIdInput, setMemberIdInput] = useState("");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [manualPolicies, setManualPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

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
    queryKey: ["coverage-eligibility-requests", "appointment", appointment.id],
    queryFn: () =>
      apis.coverageEligibilityRequest.list({ appointment: appointment.id }),
    enabled: !!appointment.id,
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

  const { mutate: createRequest, isPending: isCreating } = useMutation({
    mutationFn: apis.coverageEligibilityRequest.create,
    onSuccess: () => {
      toast.success("Policy saved for coverage verification");
      setSelectedPolicy(null);
      queryClient.invalidateQueries({
        queryKey: [
          "coverage-eligibility-requests",
          "appointment",
          appointment.id,
        ],
      });
      if (encounterId) {
        queryClient.invalidateQueries({
          queryKey: ["coverage-eligibility-requests", encounterId],
        });
      }
    },
    onError: () => {
      toast.error("Failed to save policy for coverage verification");
    },
  });

  const handleSave = () => {
    if (!selectedPolicy) return;
    createRequest({
      status: "active",
      priority: "normal",
      purpose: ["validation"],
      facility: facilityId,
      patient: patientId,
      ...(encounterId ? { encounter: encounterId } : {}),
      appointment: appointment.id,
      supporting_info: [],
      insurance: [{ sequence: 1, focal: true, policy: selectedPolicy }],
      item: [],
    });
  };

  const savedRequests = existingRequests?.results ?? [];

  const invalidateSavedRequests = () => {
    queryClient.invalidateQueries({
      queryKey: [
        "coverage-eligibility-requests",
        "appointment",
        appointment.id,
      ],
    });
    if (encounterId) {
      queryClient.invalidateQueries({
        queryKey: ["coverage-eligibility-requests", encounterId],
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="p-3 bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheckIcon className="size-5 text-primary" />
          Policy Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-3">
        {savedRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Policies saved for verification
            </p>
            {savedRequests.map((request) => (
              <SavedVerificationCard
                key={request.id}
                request={request}
                patient={patient}
                abhaNumber={abhaNumber}
                onChanged={invalidateSavedRequests}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <UmbrellaIcon className="size-4 text-primary" />
          <p className="text-sm font-medium">Verify a policy</p>
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

        <div className="grid gap-3 sm:grid-cols-2">
          {policies?.map((policy, index) => (
            <SelectablePolicyCard
              key={`api-${index}`}
              policy={policy}
              isSelected={selectedPolicy?.sno === policy.sno}
              onSelect={() => setSelectedPolicy(policy)}
            />
          ))}
          {manualPolicies.map((policy, index) => (
            <SelectablePolicyCard
              key={`manual-${MANUAL_POLICY_INDEX_OFFSET + index}`}
              policy={policy}
              isSelected={selectedPolicy?.sno === policy.sno}
              onSelect={() => setSelectedPolicy(policy)}
            />
          ))}
        </div>

        {!isPoliciesLoading &&
          !!searchParams &&
          policies?.length === 0 &&
          manualPolicies.length === 0 && (
            <p className="text-sm text-muted-foreground">No policies found</p>
          )}

        {selectedPolicy && (
          <Button
            type="button"
            className="w-full"
            onClick={handleSave}
            disabled={isCreating}
          >
            {isCreating ? "Saving…" : "Save policy for verification"}
          </Button>
        )}
      </CardContent>
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
};

const SavedVerificationCard: FC<SavedVerificationCardProps> = ({
  request,
  patient,
  abhaNumber,
  onChanged,
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
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheckIcon className="size-4 text-primary" />
          {policyName}
        </span>
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
              outcome.kind === "ok"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {outcome.kind === "ok" ? "Verified" : "Attention"}
          </Badge>
        )}
      </div>

      <div className="space-y-3 p-3">
        {isDraft && (
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
              "The payer could not process this request. Try resubmitting from the claims tab."}
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
  onSelect: () => void;
};

const SelectablePolicyCard = ({
  policy,
  isSelected,
  onSelect,
}: SelectablePolicyCardProps) => (
  <Card
    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
      isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
    }`}
    onClick={onSelect}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">{policy.productname}</CardTitle>
        {isSelected && <CheckCircle2Icon className="size-4 text-primary" />}
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <HashIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-gray-500">S.No</p>
            <p className="font-medium text-muted-foreground">{policy.sno}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScanLineIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-gray-500">Product ID</p>
            <p className="font-medium text-muted-foreground">
              {policy.productid}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserIcon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-gray-500">Member ID</p>
            <p className="font-medium text-muted-foreground">
              {policy.memberid}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2Icon className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-gray-500">Payer ID</p>
            <p className="font-medium text-muted-foreground">
              {policy.payerid}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AppointmentPolicyVerification;
