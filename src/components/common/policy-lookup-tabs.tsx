import { CreditCardIcon, PencilIcon, PhoneIcon, ScanLineIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import { Policy } from "@/types/policy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export type PolicyIdentifierTab = "abha" | "mobile" | "memberId" | "manual";

/** Hardcoded payer options for manual policy entry. Will be wired to a backend lookup later. */
const MANUAL_PAYER_OPTIONS: { value: string; label: string }[] = [
  { value: "1518@hcx", label: "PMJAY" },
];

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
  /**
   * When provided, enables the "Manual entry" tab. The callback receives a fully
   * constructed Policy (sno is auto-generated, processingid is mirrored from payerid).
   */
  onManualAdd?: (policy: Policy) => void;
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
  onManualAdd,
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
        {onManualAdd && (
          <TabsTrigger value="manual" className="gap-2">
            <PencilIcon className="h-4 w-4" />
            Manual Entry
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
          <div className="flex gap-2">
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
          <div className="flex gap-2">
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

      {onManualAdd && (
        <TabsContent value="manual">
          <ManualPolicyEntry
            abhaValue={abhaValue}
            mobileValue={mobileValue}
            onAdd={onManualAdd}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

interface ManualPolicyEntryProps {
  abhaValue: string;
  mobileValue: string;
  onAdd: (policy: Policy) => void;
}

function ManualPolicyEntry({
  abhaValue,
  mobileValue,
  onAdd,
}: ManualPolicyEntryProps) {
  const [memberId, setMemberId] = useState("");
  const [payerId, setPayerId] = useState(MANUAL_PAYER_OPTIONS[0].value);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");

  const canSubmit =
    !!memberId.trim() &&
    !!payerId &&
    !!productId.trim() &&
    !!productName.trim();

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd({
      sno: `manual-${Date.now()}`,
      abhanumber: abhaValue,
      mobilenumber: mobileValue,
      memberid: memberId.trim(),
      payerid: payerId,
      productid: productId.trim(),
      productname: productName.trim(),
      processingid: payerId,
      policy_period: null,
    });
    setMemberId("");
    setProductId("");
    setProductName("");
  };

  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="manual-abha">ABHA Number</Label>
          <Input
            id="manual-abha"
            value={abhaValue}
            disabled
            placeholder="No ABHA number linked"
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-mobile">Mobile Number</Label>
          <Input
            id="manual-mobile"
            value={mobileValue}
            disabled
            placeholder="No mobile number linked"
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-member-id">
            Member ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="manual-member-id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="Enter member ID"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-payer-id">
            Payer <span className="text-red-500">*</span>
          </Label>
          <Select value={payerId} onValueChange={setPayerId}>
            <SelectTrigger id="manual-payer-id">
              <SelectValue placeholder="Select payer" />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_PAYER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-product-id">
            Product ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="manual-product-id"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter product ID"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-product-name">
            Product Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="manual-product-name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={handleAdd} disabled={!canSubmit} size="sm">
          Add Policy
        </Button>
      </div>
    </div>
  );
}
