import { useEffect, useRef, useState } from "react";

import Autocomplete from "../ui/autocomplete";
import { Coding } from "@/types/base";
import { InsurancePlanBenefit } from "@/types/insurance_plan";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

type BenefitSearchSelectProps = {
  insurancePlanId: string | null;
  value: Coding | undefined;
  onSelect: (benefit: InsurancePlanBenefit) => void;
  disabled?: boolean;
};

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
  onSelect,
  disabled,
}: BenefitSearchSelectProps) {
  const [search, setSearch] = useState("");

  // Stable caches: id → benefit, typeCode → benefit
  const byId = useRef<Map<string, InsurancePlanBenefit>>(new Map());
  const byCode = useRef<Map<string, InsurancePlanBenefit>>(new Map());

  const { data } = useQuery({
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

  // Build combobox options using benefit.id as the value key
  const options = results.map((b) => ({
    label: `${b.type_code} · ${b.type_display}`,
    value: b.id,
  }));

  // Resolve currently selected id from the stored Coding (keyed by type_code)
  const selectedId =
    value?.code ? (results.find((b) => b.type_code === value.code)?.id ?? null) : null;

  // When the current value isn't in the page of results, add a synthetic option
  // so the control still shows the selected display text
  if (value?.code && !selectedId) {
    options.unshift({
      label: value.display ? `${value.code} · ${value.display}` : value.code,
      value: `__existing__${value.code}`,
    });
  }

  const effectiveValue =
    selectedId ?? (value?.code ? `__existing__${value.code}` : undefined);

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
    />
  );
}
