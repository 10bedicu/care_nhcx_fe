import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  Eye,
  FileText,
  Hash,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  Star,
  TrendingUp,
  User,
  Users,
  XCircle,
} from "lucide-react";
import {
  AllExtension,
  ClaimConditionExtension,
  ClaimExclusionExtension,
  ClaimSupportingInfoRequirementExtension,
  GenericExtension,
} from "@/types/insurance_plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FC, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";

import { APIError } from "@/apis/request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Policy } from "@/types/policy";
import { apis } from "@/apis";
import { toast } from "sonner";
import { useGlobalStore } from "@/hooks/use-global-store";

const isSupportingInfoRequirementExtension = (
  ext: AllExtension
): ext is ClaimSupportingInfoRequirementExtension => {
  return (
    ext?.url ===
      "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-SupportingInfoRequirement" &&
    Array.isArray(ext?.extension)
  );
};

const isExclusionExtension = (
  ext: AllExtension
): ext is ClaimExclusionExtension => {
  return (
    ext?.url ===
      "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-Exclusion" &&
    Array.isArray(ext?.extension)
  );
};

const isConditionExtension = (
  ext: AllExtension
): ext is ClaimConditionExtension => {
  return (
    ext?.url ===
      "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Claim-Condition" &&
    Array.isArray(ext?.extension)
  );
};

const isGenericExtension = (ext: AllExtension): ext is GenericExtension => {
  return (
    Boolean(ext?.url) &&
    !isSupportingInfoRequirementExtension(ext) &&
    !isExclusionExtension(ext) &&
    !isConditionExtension(ext) &&
    "valueString" in ext
  );
};

interface TextContentModalProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

const TextContentModal: FC<TextContentModalProps> = ({
  title,
  content,
  children,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="p-4 bg-muted/30 rounded-lg border">
          <iframe
            srcDoc={content}
            sandbox="allow-same-origin"
            className="w-full h-96 border-0 rounded"
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SupportingDocsExtensionProps {
  extensions: ClaimSupportingInfoRequirementExtension[];
}

const SupportingDocsExtension: FC<SupportingDocsExtensionProps> = ({
  extensions,
}) => {
  if (extensions.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Supporting Documents</h4>
            <Badge variant="outline" className="text-xs">
              {extensions.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {extensions.map((ext, index) => (
          <div
            key={ext.id || index}
            className="flex justify-between items-center p-3 border border-primary/10 rounded-lg bg-background hover:bg-primary/5 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold">
                {ext.extension?.find((subExt) => subExt.url === "category")
                  ?.valueCodeableConcept?.coding?.[0]?.display || "Document"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ext.extension?.find((subExt) => subExt.url === "code")
                  ?.valueCodeableConcept?.coding?.[0]?.display || "Required"}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 border-primary/20"
            >
              Required
            </Badge>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ExclusionsExtensionProps {
  extensions: ClaimExclusionExtension[];
}

const ExclusionsExtension: FC<ExclusionsExtensionProps> = ({ extensions }) => {
  if (extensions.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-destructive/20 transition-all">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <h4 className="text-sm font-semibold">Exclusions</h4>
            <Badge variant="outline" className="text-xs">
              {extensions.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {extensions.map((exclusion, index) => (
          <div
            key={exclusion.id || index}
            className="border rounded-lg p-3 bg-destructive/5"
          >
            <h5 className="text-sm font-medium text-destructive mb-2">
              Exclusion {index + 1}
            </h5>
            <div className="text-xs text-muted-foreground space-y-1">
              {exclusion.extension?.map((ext, extIndex) => (
                <div key={extIndex} className="flex justify-between">
                  <span className="font-medium">{ext.url}:</span>
                  <span className="ml-1">
                    {"valueString" in ext
                      ? ext.valueString
                      : "valueCodeableConcept" in ext
                      ? ext.valueCodeableConcept?.coding?.[0]?.display ||
                        ext.valueCodeableConcept?.coding?.[0]?.code ||
                        "N/A"
                      : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ConditionsExtensionProps {
  extensions: ClaimConditionExtension[];
}

const ConditionsExtension: FC<ConditionsExtensionProps> = ({ extensions }) => {
  if (extensions.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold">Conditions</h4>
            <Badge variant="outline" className="text-xs">
              {extensions.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {extensions.map((condition, index) => (
          <div
            key={condition.id || index}
            className="border rounded-lg p-3 bg-amber-50"
          >
            <h5 className="text-sm font-medium text-amber-700 mb-2">
              Condition {index + 1}
            </h5>
            <div className="text-xs text-muted-foreground space-y-1">
              {condition.extension?.map((ext, extIndex) => (
                <div key={extIndex} className="flex justify-between">
                  <span className="font-medium">{ext.url}:</span>
                  <span className="ml-1">{ext.valueUrl}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface GenericExtensionsProps {
  extensions: GenericExtension[];
}

const GenericExtensions: FC<GenericExtensionsProps> = ({ extensions }) => {
  if (extensions.length === 0) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold">Additional Information</h4>
            <Badge variant="outline" className="text-xs">
              {extensions.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {extensions.map((ext, index) => (
          <div
            key={ext.id || index}
            className="border rounded-lg p-3 bg-blue-50"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{ext.url}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {ext.valueString}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{ext.valueString}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ExtensionsDisplayProps {
  extensions?: AllExtension[];
}

const ExtensionsDisplay: FC<ExtensionsDisplayProps> = ({ extensions = [] }) => {
  const supportingDocs = extensions.filter(
    isSupportingInfoRequirementExtension
  );
  const exclusions = extensions.filter(isExclusionExtension);
  const conditions = extensions.filter(isConditionExtension);
  const generic = extensions.filter(isGenericExtension);

  const hasAnyExtensions =
    supportingDocs.length > 0 ||
    exclusions.length > 0 ||
    conditions.length > 0 ||
    generic.length > 0;

  if (!hasAnyExtensions) return null;

  return (
    <div className="space-y-3">
      <SupportingDocsExtension extensions={supportingDocs} />
      <ExclusionsExtension extensions={exclusions} />
      <ConditionsExtension extensions={conditions} />
      <GenericExtensions extensions={generic} />
    </div>
  );
};

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

const TruncatedText: FC<TruncatedTextProps> = ({
  text,
  maxLength = 50,
  className = "",
}) => {
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} cursor-help`}>
            {text.substring(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface InsurancePlanDetailsPanelProps {
  selectedInsurances: {
    sequence: number;
    focal: boolean;
    policy: Policy;
  }[];
}

interface InsurancePlanTabContentProps {
  insurance: {
    sequence: number;
    focal: boolean;
    policy: Policy;
  };
}

const InsurancePlanTabContent: FC<InsurancePlanTabContentProps> = ({
  insurance,
}) => {
  const { policy } = insurance;
  const { getStore } = useGlobalStore();

  const {
    data: planData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["insurancePlan", policy.sno],
    queryFn: () => apis.insurancePlan.get(policy.sno),
    staleTime: 5 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: () =>
      apis.insurancePlan.request({
        facility: getStore<string>("facilityId"),
        policy: policy,
      }),
    onSuccess: () => {
      toast.success("Insurance plan details requested successfully");
    },
    onError: (error) => {
      toast.error("Failed to refresh insurance plan details");
      console.error("Refresh error:", error);
    },
  });

  const handleRefresh = () => {
    if (refreshMutation.isPending) return;
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{policy.productname}</h3>
              <p className="text-xs text-muted-foreground">
                Loading plan details...
              </p>
            </div>
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const is404Error = error instanceof APIError && error.status === 404;

    if (is404Error) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber/5 to-transparent rounded-lg border border-amber/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber/10 rounded-lg">
                <Info className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{policy.productname}</h3>
                <p className="text-xs text-muted-foreground">
                  Details not available yet
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="h-8 hover:bg-amber/10 hover:border-amber/30"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {refreshMutation.isPending ? "Requesting..." : "Request Details"}
            </Button>
          </div>
          <div className="text-center py-8 bg-amber/5 rounded-lg border border-amber/10">
            <Shield className="h-12 w-12 mx-auto mb-3 text-amber-500 opacity-50" />
            <p className="text-sm text-foreground mb-2 font-medium">
              Insurance plan details are not available yet
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
              The insurance details for this plan haven't been fetched yet.
              Click "Request Details" to initiate a request to retrieve the
              latest insurance plan information.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-destructive/5 to-transparent rounded-lg border border-destructive/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{policy.productname}</h3>
              <p className="text-xs text-muted-foreground">
                Failed to load details
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="h-8 hover:bg-destructive/10 hover:border-destructive/30"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {refreshMutation.isPending ? "Refreshing..." : "Retry"}
          </Button>
        </div>
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
          <p className="text-sm text-muted-foreground mb-2 font-medium">
            {error?.message || "Failed to load insurance plan details"}
          </p>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-lg border border-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted/50 rounded-lg">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{policy.productname}</h3>
              <p className="text-xs text-muted-foreground">
                No details available
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="h-8 hover:bg-primary/10 hover:border-primary/30"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {refreshMutation.isPending ? "Fetching..." : "Fetch Details"}
          </Button>
        </div>
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-2 font-medium">
            No plan details available
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Click "Fetch Details" to load insurance plan information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">
                {policy.productname}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-medium">
                  {policy.productid}
                </Badge>
                {planData && (
                  <Badge
                    variant={
                      planData.status === "active" ? "default" : "secondary"
                    }
                    className="text-xs font-medium"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {planData.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 px-3 hover:bg-primary/10 hover:border-primary/30 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="px-4 pb-3 pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {planData.created_date && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>
                  Fetched: {new Date(planData.created_date).toLocaleString()}
                </span>
              </div>
            )}
            {planData.latest_request_date && (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>
                  Last requested:{" "}
                  {new Date(planData.latest_request_date).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {planData.text && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Plan Description</h4>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <TextContentModal
              title="Insurance Plan Description"
              content={planData.text}
            >
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="h-3 w-3 mr-1" />
                View Description
              </Button>
            </TextContentModal>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Plan Information</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Name</p>
              <TruncatedText
                text={planData.name}
                className="text-sm font-semibold"
              />
            </div>
            {planData.alias && planData.alias.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Aliases
                </p>
                <div className="flex flex-wrap gap-1">
                  {planData.alias.map((alias, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {alias}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Status
              </p>
              <Badge
                variant={planData.status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {planData.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Type</p>
              <TruncatedText
                text={
                  planData.type?.[0]?.coding?.[0]?.display ||
                  planData.type?.[0]?.coding?.[0]?.code ||
                  "Unknown Type"
                }
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Identifiers</h4>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 bg-muted/30 rounded-lg">
          {planData.product_identifier.map((identifier, index) => (
            <div key={index} className="flex items-center gap-2">
              <div>
                <TruncatedText
                  text={identifier.value || "N/A"}
                  className="text-sm font-semibold"
                />
                {identifier.system && (
                  <p className="text-xs text-muted-foreground">
                    <TruncatedText text={identifier.system} maxLength={30} />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Coverage Period</h4>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {planData.period.start
                ? new Date(planData.period.start).toLocaleDateString()
                : "N/A"}{" "}
              -
              {planData.period.end
                ? new Date(planData.period.end).toLocaleDateString()
                : "N/A"}
            </span>
            <Badge variant="outline" className="text-xs">
              {planData.period.end
                ? Math.ceil(
                    (new Date(planData.period.end).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0}{" "}
              days remaining
            </Badge>
          </div>
        </div>
      </div>

      {planData.contact && planData.contact.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Contact Information</h4>
          </div>
          <div className="space-y-2">
            {planData.contact.map((contact, index) => (
              <div key={index} className="border rounded-lg p-3 bg-background">
                {contact.name && (
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3 w-3 text-primary" />
                    <span className="text-sm font-medium">
                      {typeof contact.name === "string"
                        ? contact.name
                        : contact.name?.text || "N/A"}
                    </span>
                  </div>
                )}
                {contact.telecom && contact.telecom.length > 0 && (
                  <div className="space-y-1">
                    {contact.telecom.map((telecom, telecomIndex) => (
                      <div
                        key={telecomIndex}
                        className="flex items-center gap-2 text-xs"
                      >
                        {telecom.system === "phone" && (
                          <Phone className="h-3 w-3" />
                        )}
                        {telecom.system === "email" && (
                          <Mail className="h-3 w-3" />
                        )}
                        <span>{telecom.value}</span>
                        {telecom.use && (
                          <Badge variant="outline" className="text-xs">
                            {telecom.use}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5" />
                    <div>
                      {contact.address.line && contact.address.line.join(", ")}
                      <br />
                      {contact.address.city}, {contact.address.state}{" "}
                      {contact.address.postalCode}
                      <br />
                      {contact.address.country}
                    </div>
                  </div>
                )}
                {contact.purpose && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {contact.purpose.coding?.[0]?.display ||
                        contact.purpose.coding?.[0]?.code}
                    </Badge>
                  </div>
                )}
                {contact.extension && (
                  <ExtensionsDisplay
                    extensions={contact.extension as AllExtension[]}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Coverage</h4>
                <Badge variant="outline" className="text-xs">
                  {planData.coverage.length}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {planData.coverage.map((coverage, index) => (
              <Collapsible key={index}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-muted/20 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium">
                        <TruncatedText
                          text={
                            coverage.type?.coding?.[0]?.display ||
                            coverage.type?.coding?.[0]?.code ||
                            "Unknown Coverage"
                          }
                          maxLength={40}
                        />
                      </h5>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <div className="border rounded-lg p-3 bg-background">
                    {coverage.extension && (
                      <div className="mb-3">
                        <ExtensionsDisplay extensions={coverage.extension} />
                      </div>
                    )}

                    {coverage.benefit && coverage.benefit.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-green-200 transition-all">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <h6 className="text-sm font-semibold">
                                Benefits
                              </h6>
                              <Badge variant="outline" className="text-xs">
                                {coverage.benefit.length}
                              </Badge>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {coverage.benefit.map((benefit, benefitIndex) => (
                            <Collapsible key={benefitIndex}>
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-3 rounded-lg border border-muted/10 hover:border-green-200 transition-all">
                                  <div className="flex items-center gap-2">
                                    <TruncatedText
                                      text={
                                        benefit.type.coding?.[0]?.display ||
                                        benefit.type.coding?.[0]?.code ||
                                        "Unknown Benefit"
                                      }
                                      className="text-sm font-medium"
                                      maxLength={35}
                                    />
                                    {benefit.limit?.[0]?.value && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 border-green-200"
                                      >
                                        {benefit.limit[0].value.value?.toLocaleString()}{" "}
                                        {benefit.limit[0].value.unit}
                                      </Badge>
                                    )}
                                  </div>
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-2 pt-2">
                                <div className="border rounded-lg p-3 bg-green-50/30">
                                  {benefit.limit &&
                                    benefit.limit.length > 0 && (
                                      <div className="space-y-1 mb-2">
                                        <h6 className="text-xs font-medium text-muted-foreground">
                                          Limits:
                                        </h6>
                                        {benefit.limit.map(
                                          (limit, limitIndex) => (
                                            <div
                                              key={limitIndex}
                                              className="text-xs bg-background rounded p-2"
                                            >
                                              <div className="flex justify-between">
                                                <TruncatedText
                                                  text={
                                                    limit.code?.coding?.[0]
                                                      ?.display || "Limit"
                                                  }
                                                  maxLength={25}
                                                />
                                                <span className="font-medium">
                                                  {limit.value?.value}{" "}
                                                  {limit.value?.unit}
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}

                                  {benefit.requirement && (
                                    <div className="mb-2 p-2 bg-amber-50 rounded text-xs">
                                      <h6 className="font-medium mb-1">
                                        Requirement:
                                      </h6>
                                      <TruncatedText
                                        text={benefit.requirement}
                                        maxLength={50}
                                      />
                                    </div>
                                  )}

                                  {benefit.extension && (
                                    <ExtensionsDisplay
                                      extensions={benefit.extension}
                                    />
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {planData.plan && planData.plan.length > 0 && (
        <div className="space-y-3">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Plan Details</h4>
                  <Badge variant="outline" className="text-xs">
                    {planData.plan.length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {planData.plan.map((plan, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-muted/20 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-medium">
                          Plan {index + 1}
                        </h5>
                        {plan.type && (
                          <Badge variant="outline" className="text-xs">
                            {plan.type.coding?.[0]?.display ||
                              plan.type.coding?.[0]?.code ||
                              "Unknown"}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    <div className="border rounded-lg p-3 bg-background">
                      {plan.identifier && plan.identifier.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">
                            Identifiers:
                          </h6>
                          {plan.identifier.map((identifier, idIndex) => (
                            <div
                              key={idIndex}
                              className="flex justify-between text-xs"
                            >
                              <span>ID {idIndex + 1}:</span>
                              <TruncatedText
                                text={identifier.value || "N/A"}
                                maxLength={20}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {plan.type && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">
                            Type:
                          </h6>
                          <TruncatedText
                            text={
                              plan.type.coding?.[0]?.display ||
                              plan.type.coding?.[0]?.code ||
                              "Unknown"
                            }
                            className="text-sm"
                          />
                        </div>
                      )}

                      {plan.generalCost && plan.generalCost.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">
                            General Costs:
                          </h6>
                          <div className="space-y-1">
                            {plan.generalCost.map((cost, costIndex) => (
                              <div
                                key={costIndex}
                                className="border rounded p-2 bg-muted/20"
                              >
                                <div className="flex justify-between items-center">
                                  <TruncatedText
                                    text={
                                      cost.type?.coding?.[0]?.display || "Cost"
                                    }
                                    className="text-sm font-medium"
                                  />
                                  {cost.cost && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {cost.cost.value} INR
                                    </Badge>
                                  )}
                                </div>
                                {cost.groupSize && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Users className="h-3 w-3" />
                                    <span className="text-xs">
                                      Group: {cost.groupSize}
                                    </span>
                                  </div>
                                )}
                                {cost.comment && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <TruncatedText
                                      text={cost.comment}
                                      maxLength={50}
                                    />
                                  </p>
                                )}
                                {cost.extension && (
                                  <ExtensionsDisplay
                                    extensions={
                                      cost.extension as AllExtension[]
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {plan.specificCost && plan.specificCost.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-muted-foreground mb-1">
                            Specific Costs:
                          </h6>
                          <div className="space-y-2">
                            {plan.specificCost.map((specificCost, scIndex) => (
                              <div
                                key={scIndex}
                                className="border rounded p-2 bg-blue-50"
                              >
                                <TruncatedText
                                  text={
                                    specificCost.category?.coding?.[0]
                                      ?.display || "Category"
                                  }
                                  className="text-sm font-medium"
                                />
                                {specificCost.benefit &&
                                  specificCost.benefit.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {specificCost.benefit.map(
                                        (benefit, bIndex) => (
                                          <div
                                            key={bIndex}
                                            className="border-l-2 border-blue-300 pl-2"
                                          >
                                            <TruncatedText
                                              text={
                                                benefit.type?.coding?.[0]
                                                  ?.display || "Benefit"
                                              }
                                              className="text-xs font-medium"
                                            />
                                            {benefit.cost &&
                                              benefit.cost.length > 0 && (
                                                <div className="space-y-1 mt-1">
                                                  {benefit.cost.map(
                                                    (cost, cIndex) => (
                                                      <div
                                                        key={cIndex}
                                                        className="text-xs"
                                                      >
                                                        <div className="flex justify-between">
                                                          <TruncatedText
                                                            text={
                                                              cost.type
                                                                ?.coding?.[0]
                                                                ?.display ||
                                                              "Cost"
                                                            }
                                                            maxLength={20}
                                                          />
                                                          {cost.value && (
                                                            <span className="font-medium">
                                                              {cost.value.value}{" "}
                                                              {cost.value.unit}
                                                            </span>
                                                          )}
                                                        </div>
                                                        {cost.applicability && (
                                                          <p className="text-muted-foreground">
                                                            <TruncatedText
                                                              text={
                                                                cost
                                                                  .applicability
                                                                  .coding?.[0]
                                                                  ?.display ||
                                                                ""
                                                              }
                                                            />
                                                          </p>
                                                        )}
                                                        {cost.qualifiers &&
                                                          cost.qualifiers
                                                            .length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                              {cost.qualifiers.map(
                                                                (
                                                                  qualifier,
                                                                  qIndex
                                                                ) => (
                                                                  <Badge
                                                                    key={qIndex}
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                  >
                                                                    {qualifier
                                                                      .coding?.[0]
                                                                      ?.display ||
                                                                      qualifier
                                                                        .coding?.[0]
                                                                        ?.code}
                                                                  </Badge>
                                                                )
                                                              )}
                                                            </div>
                                                          )}
                                                        {cost.extension && (
                                                          <ExtensionsDisplay
                                                            extensions={
                                                              cost.extension as AllExtension[]
                                                            }
                                                          />
                                                        )}
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                            {benefit.extension && (
                                              <ExtensionsDisplay
                                                extensions={
                                                  benefit.extension as AllExtension[]
                                                }
                                              />
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                {specificCost.extension && (
                                  <ExtensionsDisplay
                                    extensions={
                                      specificCost.extension as AllExtension[]
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {plan.extension && (
                        <ExtensionsDisplay
                          extensions={plan.extension as AllExtension[]}
                        />
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <ExtensionsDisplay extensions={planData.extension || []} />
    </div>
  );
};

export const InsurancePlanDetailsPanel: FC<InsurancePlanDetailsPanelProps> = ({
  selectedInsurances,
}) => {
  const [panelHeight, setPanelHeight] = useState<number>(600);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateHeight = () => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const topOffset = rect.top;
        const bottomMargin = 24;
        const availableHeight = window.innerHeight - topOffset - bottomMargin;
        setPanelHeight(Math.max(700, Math.min(900, availableHeight)));
      }
    };

    const timer = setTimeout(calculateHeight, 100);
    window.addEventListener("resize", calculateHeight);
    window.addEventListener("scroll", calculateHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateHeight);
      window.removeEventListener("scroll", calculateHeight);
    };
  }, [selectedInsurances]);

  if (selectedInsurances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Insurance Plan Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an insurance to view plan details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      ref={panelRef}
      className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 flex flex-col"
      style={{ height: `${panelHeight}px` }}
    >
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Insurance Plan Details
              </CardTitle>
              <div className="text-xs text-muted-foreground font-normal mt-1">
                {selectedInsurances.length} insurance
                {selectedInsurances.length !== 1 ? "s" : ""} selected
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-y-auto">
        {selectedInsurances.length === 1 ? (
          <InsurancePlanTabContent insurance={selectedInsurances[0]} />
        ) : (
          <Tabs
            defaultValue={`${selectedInsurances[0].policy.productid}-${selectedInsurances[0].policy.memberid}`}
          >
            <TabsList className="grid w-full grid-cols-2 h-auto p-1.5 bg-muted/50 gap-1">
              {selectedInsurances.map((insurance) => (
                <TabsTrigger
                  key={`${insurance.policy.productid}-${insurance.policy.memberid}`}
                  value={`${insurance.policy.productid}-${insurance.policy.memberid}`}
                  className="text-xs h-auto py-3 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-primary/20 transition-all"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-2">
                      {insurance.focal && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <span className="text-xs leading-tight font-medium">
                        {insurance.policy.productname}
                      </span>
                    </div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            {selectedInsurances.map((insurance) => (
              <TabsContent
                key={`${insurance.policy.productid}-${insurance.policy.memberid}`}
                value={`${insurance.policy.productid}-${insurance.policy.memberid}`}
                className="mt-4"
              >
                <InsurancePlanTabContent insurance={insurance} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
