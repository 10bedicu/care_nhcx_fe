import {
  Building2Icon,
  HashIcon,
  ScanLineIcon,
  UmbrellaIcon,
  UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  PolicyIdentifierTab,
  PolicyLookupTabs,
} from "@/components/common/policy-lookup-tabs";
import { useEffect, useState } from "react";

import { Checkbox } from "../ui/checkbox";
import { Policy } from "@/types/policy";
import { UseFormReturn } from "react-hook-form";
import { apis } from "@/apis";
import { createClaimFormSchema } from "./schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

interface ClaimInsuranceSectionProps {
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
}

type SearchParams = {
  identifiertype: "AbhaNumber" | "MobileNo" | "MemberId";
  identifiervalue: string;
};

export function ClaimInsuranceSection({ form }: ClaimInsuranceSectionProps) {
  const [activeTab, setActiveTab] = useState<PolicyIdentifierTab>("abha");
  const [mobileInput, setMobileInput] = useState("");
  const [memberIdInput, setMemberIdInput] = useState("SBXSTG007");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  const { data: abhaNumber } = useQuery({
    queryKey: ["abhaNumber", form.getValues("patient")],
    queryFn: () => apis.abhaNumber.get(form.getValues("patient")),
    enabled: !!form.getValues("patient"),
  });

  useEffect(() => {
    if (abhaNumber?.mobile) {
      setMobileInput(abhaNumber.mobile);
    }
  }, [abhaNumber?.mobile]);

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
      setSearchParams({ identifiertype: "MobileNo", identifiervalue: mobileInput });
    } else if (activeTab === "memberId" && memberIdInput) {
      setSearchParams({ identifiertype: "MemberId", identifiervalue: memberIdInput });
    }
  };

  const { data: policies, isFetching: isPoliciesLoading } = useQuery({
    queryKey: ["policies", searchParams],
    queryFn: () => apis.gateway.policies(searchParams!),
    enabled: !!searchParams,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <UmbrellaIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Select insurances</h3>
          <p className="text-sm text-muted-foreground">
            Select the insurances that are applicable to the claim.
          </p>
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
        isLoading={isPoliciesLoading}
      />

      <div>
        <FormField
          control={form.control}
          name="insurance"
          render={() => (
            <div className="flex justify-between items-center gap-2">
              <FormItem className="w-full">
                <FormControl>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {policies?.map((policy, index) => (
                      <PolicyCard
                        key={index}
                        policy={policy}
                        index={index + 1}
                        form={form}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            </div>
          )}
        />
      </div>
    </div>
  );
}

type PolicyCardProps = {
  policy: Policy;
  index: number;
  form: UseFormReturn<z.infer<typeof createClaimFormSchema>>;
};

const PolicyCard = ({ policy, index, form }: PolicyCardProps) => {
  const selectedInsurance = form
    .watch("insurance")
    ?.find((insurance) => insurance.sequence === index);

  const isSelected = !!selectedInsurance;
  const isFocal = selectedInsurance?.focal;

  const togglePolicySelection = () => {
    if (isSelected) {
      form.setValue(
        "insurance",
        form
          .getValues("insurance")
          .filter((insurance) => insurance.sequence !== index)
      );
    } else {
      form.setValue("insurance", [
        ...(form.getValues("insurance") ?? []),
        {
          sequence: index,
          policy: policy,
          focal: false,
        },
      ]);
    }
  };

  const handleFocalPolicyChange = (focal: boolean) => {
    form.setValue(
      "insurance",
      form
        .getValues("insurance")
        .map((insurance) =>
          insurance.sequence === index
            ? { ...insurance, focal }
            : { ...insurance, focal: focal ? false : insurance.focal }
        )
    );
  };

  return (
    <Card
      key={policy.sno}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={togglePolicySelection}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {policy.productname}
          </CardTitle>
          {isSelected && (
            <div>
              <div
                className="flex items-center space-x-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id={`focal-${index}`}
                  checked={isFocal}
                  onCheckedChange={handleFocalPolicyChange}
                  className="border-black"
                />
                <label
                  htmlFor={`focal-${index}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Focal Policy
                </label>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <HashIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-gray-500">S.No</p>
              <p className="font-medium text-muted-foreground">{policy.sno}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ScanLineIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-gray-500">Product ID</p>
              <p className="font-medium text-muted-foreground">
                {policy.productid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-gray-500">Member ID</p>
              <p className="font-medium text-muted-foreground">
                {policy.memberid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Building2Icon className="h-4 w-4 text-muted-foreground" />
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
};
