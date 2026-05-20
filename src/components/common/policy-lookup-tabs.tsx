import { CreditCardIcon, PhoneIcon, ScanLineIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";

export type PolicyIdentifierTab = "abha" | "mobile" | "memberId";

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
    </Tabs>
  );
}
