import {
  CreditCardIcon,
  PhoneIcon,
  ScanLineIcon,
  SearchIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useRef, useState } from "react";

import Autocomplete from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import { ParticipantSummary } from "@/types/participant";
import { Policy } from "@/types/policy";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

export type PolicyIdentifierTab = "abha" | "mobile" | "memberId" | "manual";


const HARDCODED_PAYERS: ParticipantSummary[] = [
  {
    participantcode: "1518@hcx",
    participantname: "PMJAY",
    address: null,
    state: "Telangana",
  },
];

function formatGatewayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface PolicyLookupTabsProps {
  abhaValue: string;
  mobileValue: string;
  memberIdValue: string;
  onMobileChange: (value: string) => void;
  onMemberIdChange: (value: string) => void;
  activeTab: PolicyIdentifierTab;
  onTabChange: (tab: PolicyIdentifierTab) => void;
  onSearch: () => void;
  isLoading?: boolean;
  onDiscover?: (policy: Policy) => void;
  isDiscovering?: boolean;
}

export function PolicyLookupTabs({
  abhaValue,
  mobileValue,
  memberIdValue,
  onMobileChange,
  onMemberIdChange,
  activeTab,
  onTabChange,
  onSearch,
  isLoading = false,
  onDiscover,
  isDiscovering = false,
}: PolicyLookupTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as PolicyIdentifierTab)}
    >
      <TabsList>
        <TabsTrigger value="abha" className="gap-2">
          <ScanLineIcon className="h-4 w-4" />
          ABHA Number
        </TabsTrigger>
        <TabsTrigger value="mobile" className="gap-2">
          <PhoneIcon className="h-4 w-4" />
          Mobile Number
        </TabsTrigger>
        <TabsTrigger value="memberId" className="gap-2">
          <CreditCardIcon className="h-4 w-4" />
          Member ID
        </TabsTrigger>
        {onDiscover && (
          <TabsTrigger value="manual" className="gap-2">
            <SearchIcon className="h-4 w-4" />
            Manual
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="abha">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="abha-input"
              value={abhaValue}
              disabled
              placeholder="No ABHA number linked"
              className="flex-1 bg-muted/50"
            />
            {isLoading && activeTab === "abha" && (
              <div className="flex items-center px-3 text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          {!abhaValue && (
            <p className="text-xs text-muted-foreground">
              No ABHA number is linked to this patient.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="mobile">
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              id="mobile-input"
              value={mobileValue}
              onChange={(e) => onMobileChange(e.target.value)}
              placeholder="Enter mobile number"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={onSearch}
              disabled={!mobileValue || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="memberId">
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              id="memberid-input"
              value={memberIdValue}
              onChange={(e) => onMemberIdChange(e.target.value)}
              placeholder="Enter member ID"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={onSearch}
              disabled={!memberIdValue || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
      </TabsContent>

      {onDiscover && (
        <TabsContent value="manual">
          <PayerDiscoveryEntry
            abhaValue={abhaValue}
            mobileValue={mobileValue}
            onDiscover={onDiscover}
            isDiscovering={isDiscovering}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

interface PayerDiscoveryEntryProps {
  abhaValue: string;
  mobileValue: string;
  onDiscover: (policy: Policy) => void;
  isDiscovering: boolean;
}

function PayerDiscoveryEntry({
  abhaValue,
  mobileValue,
  onDiscover,
  isDiscovering,
}: PayerDiscoveryEntryProps) {
  const [payerCode, setPayerCode] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [productId, setProductId] = useState("");

  // Portal the payer dropdown into the surrounding dialog/sheet (if any) so it
  // is not blocked by the modal's focus trap / pointer-events guard.
  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    const dialog = containerRef.current?.closest(
      '[role="dialog"]',
    ) as HTMLElement | null;
    setPortalContainer(dialog);
  }, []);

  // Query a wide date window so the full registry is returned; the gateway
  // requires both bounds in dd/MM/yyyy format.
  const dateRange = useMemo(
    () => ({
      fromdate: "01/01/2020",
      todate: formatGatewayDate(new Date()),
    }),
    [],
  );

  const { data: participantsRaw, isFetching: isParticipantsLoading } = useQuery(
    {
      queryKey: ["participants", "PAYER", dateRange.fromdate, dateRange.todate],
      queryFn: () =>
        apis.gateway.participants({
          role: "PAYER",
          fromdate: dateRange.fromdate,
          todate: dateRange.todate,
        }),
    },
  );

  const payerOptions = useMemo(() => {
    const apiParticipants: ParticipantSummary[] = Array.isArray(
      participantsRaw?.participantdetails,
    )
      ? participantsRaw.participantdetails
      : [];
    const apiCodes = new Set(apiParticipants.map((p) => p.participantcode));
    const extras = HARDCODED_PAYERS.filter(
      (p) => !apiCodes.has(p.participantcode),
    );
    return [...extras, ...apiParticipants].map((participant) => ({
      value: participant.participantcode,
      label: `${participant.participantname} (${participant.participantcode})`,
    }));
  }, [participantsRaw]);

  const canSubmit =
    !!payerCode &&
    !!policyNumber.trim() &&
    !!productId.trim() &&
    !isDiscovering;

  const handleDiscover = () => {
    if (!canSubmit) return;
    onDiscover({
      sno: `discovery-${Date.now()}`,
      abhanumber: abhaValue,
      mobilenumber: mobileValue,
      memberid: policyNumber.trim(),
      payerid: payerCode,
      productid: productId.trim(),
      productname: "",
      processingid: payerCode,
      policy_period: null,
    });
  };

  return (
    <div
      ref={containerRef}
      className="space-y-4 rounded-md border bg-muted/30 p-4"
    >
      <p className="text-xs text-muted-foreground">
        Couldn't find a policy? Pick a payer and enter the policy number from
        the beneficiary's card to discover coverage directly with the payer.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="discovery-payer">
            Payer <span className="text-red-500">*</span>
          </Label>
          <Autocomplete
            options={payerOptions}
            value={payerCode}
            onChange={setPayerCode}
            isLoading={isParticipantsLoading}
            placeholder={
              isParticipantsLoading ? "Loading payers…" : "Select payer"
            }
            noOptionsMessage="No payers found"
            align="start"
            container={portalContainer}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discovery-policy-number">
            Policy Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="discovery-policy-number"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="Enter policy number from the beneficiary card"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discovery-product-id">
            Product ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="discovery-product-id"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter product ID"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleDiscover}
          disabled={!canSubmit}
          size="sm"
        >
          {isDiscovering ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Discovering…
            </>
          ) : (
            "Discover Policies"
          )}
        </Button>
      </div>
    </div>
  );
}
