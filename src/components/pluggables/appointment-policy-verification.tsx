import {
  Building2Icon,
  CheckCircle2Icon,
  HashIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  UmbrellaIcon,
  UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PolicyIdentifierTab,
  PolicyLookupTabs,
} from "@/components/common/policy-lookup-tabs";
import { FC, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineLoading } from "@/components/common/loading-spinner";
import { Policy } from "@/types/policy";
import { apis } from "@/apis";
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
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Policies saved for verification
            </p>
            {savedRequests.map((request) => {
              const focal =
                request.insurance.find((i) => i.focal) ?? request.insurance[0];
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2Icon className="size-4 text-primary" />
                    {focal?.policy.productname ?? "Policy"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {request.encounter ? "Linked" : "Pending encounter"}
                  </Badge>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Submit the coverage check from the encounter's claims tab.
            </p>
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
