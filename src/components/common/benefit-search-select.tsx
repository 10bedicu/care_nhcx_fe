import { useEffect, useRef, useState } from "react";

import Autocomplete from "../ui/autocomplete";
import { Coding } from "@/types/base";
import { InsurancePlanBenefit } from "@/types/insurance_plan";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

type BenefitSearchSelectProps = {
  insurancePlanId: string | null;
  value: Coding | undefined;
  /** Used to distinguish benefits that share the same procedure code. */
  categoryCode?: string;
  categoryDisplay?: string;
  onSelect: (benefit: InsurancePlanBenefit) => void;
  disabled?: boolean;
};

function formatBenefitLabel(
  typeCode: string,
  typeDisplay: string,
  categoryCode?: string,
  categoryDisplay?: string,
) {
  const procedure = `${typeCode} · ${typeDisplay}`;
  if (categoryCode || categoryDisplay) {
    const category = [categoryCode, categoryDisplay].filter(Boolean).join(" · ");
    return `${category} · ${procedure}`;
  }
  return procedure;
}

/**
 * Searches InsurancePlanBenefit records instead of a FHIR valueset.
 * Requires insurancePlanId (derived from the focal policy's plan lookup).
 *
 * Maps benefit.id internally as the option key.
 * Calls onSelect with the full InsurancePlanBenefit so the parent can
 * auto-populate category, program_code, etc.
 */
export default function BenefitSearchSelect({
  insurancePlanId,
  value,
  categoryCode,
  categoryDisplay,
  onSelect,
  disabled,
}: BenefitSearchSelectProps) {
  const [search, setSearch] = useState("");

  const byId = useRef<Map<string, InsurancePlanBenefit>>(new Map());
  const byCode = useRef<Map<string, InsurancePlanBenefit>>(new Map());

  const { data, isFetching } = useQuery({
    queryKey: ["insurancePlanBenefit", "list", insurancePlanId, search],
    queryFn: () =>
      apis.insurancePlanBenefit.list({
        insurance_plan: insurancePlanId!,
        ...(search ? { q: search } : {}),
        limit: 20,
      }),
    enabled: Boolean(insurancePlanId),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    data?.results?.forEach((b) => {
      byId.current.set(b.id, b);
      byCode.current.set(b.type_code, b);
    });
  }, [data]);

  const results = data?.results ?? [];

  const options = results.map((b) => ({
    label: formatBenefitLabel(
      b.type_code,
      b.type_display,
      b.coverage_type_code,
      b.coverage_type_display,
    ),
    value: b.id,
  }));

  const selectedId = value?.code
    ? (results.find(
        (b) =>
          b.type_code === value.code &&
          (!categoryCode || b.coverage_type_code === categoryCode),
      )?.id ?? null)
    : null;

  // When the current value isn't in the page of results, add a synthetic option
  // so the control still shows the selected display text
  if (value?.code && !selectedId) {
    options.unshift({
      label: formatBenefitLabel(
        value.code,
        value.display ?? value.code,
        categoryCode,
        categoryDisplay,
      ),
      value: `__existing__${value.code}__${categoryCode ?? ""}`,
    });
  }

  const effectiveValue =
    selectedId ??
    (value?.code ? `__existing__${value.code}__${categoryCode ?? ""}` : undefined);

  return (
    <Autocomplete
      options={options}
      value={effectiveValue}
      onChange={(id) => {
        const benefit = byId.current.get(id);
        if (benefit) {
          onSelect(benefit);
        }
      }}
      onSearch={setSearch}
      disabled={disabled || !insurancePlanId}
      placeholder={
        insurancePlanId ? "Search procedures…" : "Select an insurance first"
      }
      noOptionsMessage={
        insurancePlanId ? "No procedures found" : "Select an insurance to search procedures"
      }
      isLoading={Boolean(insurancePlanId) && isFetching}
    />
  );
}
