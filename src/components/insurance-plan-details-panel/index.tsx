import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Star,
  Tag,
  XCircle,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { FC, useState } from "react";
import {
  InsurancePlan,
  InsurancePlanBenefit,
  InsurancePlanBenefitCondition,
  InsurancePlanBenefitDetail,
  InsurancePlanBenefitExclusion,
  InsurancePlanSupportingInfoRequirement,
  InsurancePlanTier,
} from "@/types/insurance_plan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";

import { APIError } from "@/apis/request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Policy } from "@/types/policy";
import { Separator } from "@/components/ui/separator";
import { apis } from "@/apis";
import { toast } from "sonner";
import { useGlobalStore } from "@/hooks/use-global-store";

const PAGE_SIZE = 10;

const formatCurrency = (amount: string, unit = "INR") =>
  `${unit} ${parseFloat(amount).toLocaleString("en-IN")}`;

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
    retired: "bg-gray-100 text-gray-600 border-gray-200",
    unknown: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
        variants[status] ?? variants.unknown
      }`}
    >
      {status === "active" && <CheckCircle className="h-3 w-3" />}
      {status}
    </span>
  );
};

interface PlanHeaderProps {
  plan: InsurancePlan;
  policy: Policy;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PlanHeader: FC<PlanHeaderProps> = ({
  plan,
  policy,
  onRefresh,
  isRefreshing,
}) => (
  <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/10 p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {plan.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {policy.productname}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={plan.status} />
            <Badge variant="outline" className="text-xs">
              {plan.identifier_value}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-8 px-2.5 shrink-0"
      >
        {isRefreshing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs">
      {plan.period_start && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            {new Date(plan.period_start).toLocaleDateString()} –{" "}
            {plan.period_end
              ? new Date(plan.period_end).toLocaleDateString()
              : "ongoing"}
          </span>
        </div>
      )}
      {plan.owned_by_name && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Building className="h-3 w-3 shrink-0" />
          <span className="truncate">{plan.owned_by_name}</span>
        </div>
      )}
    </div>

    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Plans", value: plan.n_plans, icon: Layers },
        { label: "Coverages", value: plan.n_coverages, icon: Shield },
        { label: "Benefits", value: plan.n_benefits, icon: ClipboardList },
        { label: "Forms", value: plan.n_questionnaires, icon: FileText },
      ].map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-background/70 rounded-md p-2 text-center border border-border/50"
        >
          <Icon className="h-3 w-3 mx-auto mb-0.5 text-primary" />
          <div className="font-semibold text-sm">{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

interface PlanTierPickerProps {
  planId: string;
  selectedTierId: string | null;
  onSelect: (tierId: string | null) => void;
}

const PlanTierPicker: FC<PlanTierPickerProps> = ({
  planId,
  selectedTierId,
  onSelect,
}) => {
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["insurancePlan", planId, "plans"],
    queryFn: () => apis.insurancePlan.plans(planId),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading)
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading plan tiers…
      </div>
    );

  if (!tiers || tiers.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Layers className="h-3 w-3" />
        Plan Tier
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            selectedTierId === null
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          All (
          {tiers.reduce(
            (s: number, t: InsurancePlanTier) => s + t.n_benefits,
            0
          )}
          )
        </button>
        {tiers.map((tier: InsurancePlanTier) => (
          <button
            key={tier.id}
            onClick={() => onSelect(tier.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              selectedTierId === tier.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            {tier.type_display} ({tier.n_benefits.toLocaleString()})
          </button>
        ))}
      </div>
    </div>
  );
};

interface BenefitListItemProps {
  benefit: InsurancePlanBenefit;
  onClick: () => void;
}

const BenefitListItem: FC<BenefitListItemProps> = ({ benefit, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
            {benefit.type_display}
          </span>
          {benefit.is_day_care && (
            <Badge variant="outline" className="text-xs shrink-0">
              Day care
            </Badge>
          )}
          {benefit.authorization_required && (
            <Badge
              variant="outline"
              className="text-xs shrink-0 border-amber-200 text-amber-700"
            >
              Auth required
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="font-mono">{benefit.type_code}</span>
          <span>·</span>
          <span>{benefit.coverage_type_display}</span>
          {benefit.procedure_type && (
            <>
              <span>·</span>
              <span>{benefit.procedure_type}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold">
          {formatCurrency(benefit.max_cost)}
        </div>
        {benefit.min_cost !== benefit.max_cost && (
          <div className="text-xs text-muted-foreground">
            from {formatCurrency(benefit.min_cost)}
          </div>
        )}
      </div>
    </div>
    {(benefit.has_questionnaire ||
      benefit.requires_supporting_info ||
      benefit.has_stratification_qualifier) && (
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {benefit.requires_supporting_info && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
            <FileText className="h-3 w-3" />
            {benefit.supporting_info_count} docs
          </span>
        )}
        {benefit.has_questionnaire && (
          <span className="inline-flex items-center gap-1 text-xs text-purple-600">
            <BookOpen className="h-3 w-3" />
            Forms
          </span>
        )}
        {benefit.has_stratification_qualifier && (
          <span className="inline-flex items-center gap-1 text-xs text-teal-600">
            <Tag className="h-3 w-3" />
            Tiered pricing
          </span>
        )}
      </div>
    )}
  </button>
);

interface BenefitDetailDialogProps {
  benefitId: string | null;
  open: boolean;
  onClose: () => void;
}

const SISRRow: FC<{ sisr: InsurancePlanSupportingInfoRequirement }> = ({
  sisr,
}) => {
  const label =
    sisr.code?.coding?.[0]?.display ||
    sisr.code_code ||
    sisr.category?.coding?.[0]?.display ||
    sisr.category_code;

  if (sisr.questionnaire) {
    return (
      <div className="flex items-center justify-between p-2 rounded border border-purple-100 bg-purple-50/50">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-purple-600 shrink-0" />
          <span className="text-xs font-medium">
            {sisr.questionnaire.title}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-purple-200 text-purple-700"
        >
          Form
        </Badge>
      </div>
    );
  }

  if (sisr.documentation_url) {
    return (
      <a
        href={sisr.documentation_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-2 rounded border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-blue-200 text-blue-700"
        >
          External
        </Badge>
      </a>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 rounded border border-border/60 bg-muted/30">
      <div className="flex items-center gap-2">
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs">Mandatory document: {label}</span>
      </div>
      <Badge variant="outline" className="text-xs">
        Required
      </Badge>
    </div>
  );
};

const ConditionSummary: FC<{ condition: InsurancePlanBenefitCondition }> = ({
  condition,
}) => {
  const flags = [
    condition.approval_not_required && "No auth required",
    condition.is_day_care && "Day care",
    condition.implant_applicable && "Implant applicable",
    condition.stratification_allowed && "Stratification allowed",
    condition.enhancement_allowed && "Enhancement allowed",
    condition.cyclic_procedure &&
      `Cyclic (max ${condition.maximum_cycles_allowed})`,
  ].filter(Boolean);

  return (
    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
      {condition.procedure_type && (
        <div className="text-xs">
          <span className="text-muted-foreground">Procedure type: </span>
          <span className="font-medium">{condition.procedure_type}</span>
        </div>
      )}
      {condition.quantity_allowed > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground">Quantity allowed: </span>
          <span className="font-medium">{condition.quantity_allowed}</span>
        </div>
      )}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((f) => (
            <Badge key={f.toString()} variant="outline" className="text-xs">
              {f}
            </Badge>
          ))}
        </div>
      )}
      {condition.description && (
        <p className="text-xs text-muted-foreground">{condition.description}</p>
      )}
    </div>
  );
};

const ExclusionRow: FC<{ exclusion: InsurancePlanBenefitExclusion }> = ({
  exclusion,
}) => (
  <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1">
    <div className="text-xs font-medium text-destructive">
      {exclusion.category?.coding?.[0]?.display || exclusion.category_code}
    </div>
    {exclusion.statements.map((s, i) => (
      <p key={i} className="text-xs text-muted-foreground">
        {s}
      </p>
    ))}
  </div>
);

const BenefitDetailContent: FC<{ detail: InsurancePlanBenefitDetail }> = ({
  detail,
}) => {
  const baseCost = detail.costs.find((c) => c.type_code === "Procedure");
  const stratCosts = detail.costs.filter(
    (c) => c.type_code === "Stratification"
  );

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono">
            {detail.type_code}
          </Badge>
          <Badge variant="outline">{detail.coverage_type_display}</Badge>
          {detail.procedure_type && (
            <Badge variant="outline">{detail.procedure_type}</Badge>
          )}
          {detail.is_day_care && <Badge variant="outline">Day care</Badge>}
          {detail.authorization_required && (
            <Badge
              variant="outline"
              className="border-amber-200 text-amber-700"
            >
              Auth required
            </Badge>
          )}
        </div>
        {detail.specialty_category_display && (
          <p className="text-xs text-muted-foreground">
            {detail.specialty_category_display}
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Pricing
        </h4>

        {baseCost && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <span className="text-sm text-muted-foreground">
              Base / package rate
            </span>
            <span className="font-semibold">
              {parseFloat(baseCost.value_amount) === 0
                ? "Fully covered"
                : formatCurrency(baseCost.value_amount, baseCost.value_unit)}
            </span>
          </div>
        )}

        {stratCosts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Ward-tier pricing
            </p>
            {stratCosts.map((cost) =>
              cost.qualifiers.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-teal-100 bg-teal-50/40"
                >
                  <div>
                    <div className="text-xs font-medium">
                      {q.qualifier?.coding?.[0]?.display || q.qualifier_code}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {q.qualifier_type}
                    </div>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatCurrency(cost.value_amount, cost.value_unit)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {detail.limits.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Limits</p>
            {detail.limits.map((limit) => (
              <div
                key={limit.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-background"
              >
                <span className="text-xs text-muted-foreground">
                  {limit.code?.coding?.[0]?.display || "Maximum payout"}
                </span>
                <span className="font-semibold text-sm">
                  {formatCurrency(limit.value_amount, limit.value_unit)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {detail.supporting_info_requirements.length > 0 && (
        <>
          <Separator />
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Supporting Documents
                <Badge variant="outline" className="text-xs">
                  {detail.supporting_info_requirements.length}
                </Badge>
              </h4>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3">
              {detail.supporting_info_requirements.map((sisr) => (
                <SISRRow key={sisr.id} sisr={sisr} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {detail.conditions.length > 0 && (
        <>
          <Separator />
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Conditions
                <Badge variant="outline" className="text-xs">
                  {detail.conditions.length}
                </Badge>
              </h4>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3">
              {detail.conditions.map((c) => (
                <ConditionSummary key={c.id} condition={c} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {detail.exclusions.length > 0 && (
        <>
          <Separator />
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Exclusions
                <Badge variant="outline" className="text-xs">
                  {detail.exclusions.length}
                </Badge>
              </h4>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3">
              {detail.exclusions.map((e) => (
                <ExclusionRow key={e.id} exclusion={e} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {detail.questionnaires.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
              Required Forms
            </h4>
            {detail.questionnaires.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-purple-100 bg-purple-50/40"
              >
                <div>
                  <div className="text-xs font-medium">{q.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {q.fhir_id}
                  </div>
                </div>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const BenefitDetailDialog: FC<BenefitDetailDialogProps> = ({
  benefitId,
  open,
  onClose,
}) => {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["insurancePlanBenefit", benefitId],
    queryFn: () => apis.insurancePlanBenefit.get(benefitId!),
    enabled: open && Boolean(benefitId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {detail ? detail.type_display : "Loading…"}
          </DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {detail && <BenefitDetailContent detail={detail} />}
      </DialogContent>
    </Dialog>
  );
};

interface BenefitBrowserProps {
  planId: string;
  tierId: string | null;
}

const BenefitBrowser: FC<BenefitBrowserProps> = ({ planId, tierId }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedBenefitId, setSelectedBenefitId] = useState<string | null>(
    null
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(
      (window as { _benefitSearchTimer?: ReturnType<typeof setTimeout> })
        ._benefitSearchTimer
    );
    (
      window as { _benefitSearchTimer?: ReturnType<typeof setTimeout> }
    )._benefitSearchTimer = setTimeout(() => {
      setDebouncedSearch(value);
      setOffset(0);
    }, 400);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "insurancePlanBenefit",
      "list",
      planId,
      tierId,
      debouncedSearch,
      offset,
    ],
    queryFn: () =>
      apis.insurancePlanBenefit.list({
        insurance_plan: planId,
        ...(tierId ? { plan_tier: tierId } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        limit: PAGE_SIZE,
        offset,
      }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search procedures…"
          className="pl-8 h-8 text-sm"
        />
        {isFetching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Count */}
      {data && (
        <p className="text-xs text-muted-foreground">
          {data.count.toLocaleString()} benefit
          {data.count !== 1 ? "s" : ""}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </p>
      )}

      {/* List */}
      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : data?.results?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No benefits found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data?.results?.map((benefit) => (
            <BenefitListItem
              key={benefit.id}
              benefit={benefit}
              onClick={() => setSelectedBenefitId(benefit.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!data?.next}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <BenefitDetailDialog
        benefitId={selectedBenefitId}
        open={Boolean(selectedBenefitId)}
        onClose={() => setSelectedBenefitId(null)}
      />
    </div>
  );
};

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
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const {
    data: listData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["insurancePlan", "list", policy.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with policy.sno
      }),
    staleTime: 5 * 60 * 1000,
  });

  const plan: InsurancePlan | undefined = listData?.results?.[0];

  const refreshMutation = useMutation({
    mutationFn: () =>
      apis.insurancePlan.request({
        facility: getStore<string>("facilityId"),
        policy,
      }),
    onSuccess: () => {
      toast.success(
        "Insurance plan request submitted. Details will be available shortly."
      );
    },
    onError: () => {
      toast.error("Failed to request insurance plan details");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-8 rounded bg-muted/50 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const is404 = error instanceof APIError && error.status === 404;

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <div
          className={`flex items-center justify-between p-4 rounded-lg border ${
            is404 || !plan
              ? "border-amber-200 bg-amber-50/50"
              : "border-destructive/20 bg-destructive/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                is404 || !plan ? "bg-amber-100" : "bg-destructive/10"
              }`}
            >
              {is404 || !plan ? (
                <Info className="h-4 w-4 text-amber-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{policy.productname}</h3>
              <p className="text-xs text-muted-foreground">
                {is404 || !plan
                  ? "Plan details not yet available"
                  : "Failed to load plan details"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="h-8"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {refreshMutation.isPending ? "Requesting…" : "Request Details"}
          </Button>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {is404 || !plan
              ? "No plan data found for this policy. Request details from the payer."
              : (error as Error)?.message || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlanHeader
        plan={plan}
        policy={policy}
        onRefresh={() => refreshMutation.mutate()}
        isRefreshing={refreshMutation.isPending}
      />

      {plan.n_plans > 1 && (
        <PlanTierPicker
          planId={plan.id}
          selectedTierId={selectedTierId}
          onSelect={setSelectedTierId}
        />
      )}

      <Separator />

      <BenefitBrowser planId={plan.id} tierId={selectedTierId} />
    </div>
  );
};

interface InsurancePlanDetailsPanelProps {
  selectedInsurances: {
    sequence: number;
    focal: boolean;
    policy: Policy;
  }[];
}

export const InsurancePlanDetailsPanel: FC<InsurancePlanDetailsPanelProps> = ({
  selectedInsurances,
}) => {
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
          <div className="text-center py-10 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select an insurance to view plan details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 flex flex-col max-h-[calc(100vh-3rem)]">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Insurance Plan Details
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedInsurances.length} insurance
              {selectedInsurances.length !== 1 ? "s" : ""} selected
            </p>
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
            <TabsList
              className="grid w-full h-auto p-1 bg-muted/50 gap-1 mb-4"
              style={{
                gridTemplateColumns: `repeat(${selectedInsurances.length}, 1fr)`,
              }}
            >
              {selectedInsurances.map((ins) => (
                <TabsTrigger
                  key={`${ins.policy.productid}-${ins.policy.memberid}`}
                  value={`${ins.policy.productid}-${ins.policy.memberid}`}
                  className="text-xs h-auto py-2 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {ins.focal && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                      <span className="leading-tight font-medium truncate max-w-[80px]">
                        {ins.policy.productname}
                      </span>
                    </div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            {selectedInsurances.map((ins) => (
              <TabsContent
                key={`${ins.policy.productid}-${ins.policy.memberid}`}
                value={`${ins.policy.productid}-${ins.policy.memberid}`}
              >
                <InsurancePlanTabContent insurance={ins} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
