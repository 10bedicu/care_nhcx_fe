import { apis } from "@/apis";
import { Policy } from "@/types/policy";
import { useQuery } from "@tanstack/react-query";

export function useFocalPlanId(focalPolicy?: Policy): {
  planId: string | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["insurancePlan", "list", focalPolicy?.sno],
    queryFn: () =>
      apis.insurancePlan.list({
        identifier_value: "100155-IN2910001986", // FIXME: replace with focalPolicy!.sno
      }),
    enabled: Boolean(focalPolicy?.sno),
    staleTime: 5 * 60 * 1000,
  });
  return {
    planId: data?.results?.[0]?.id ?? null,
    isLoading,
  };
}

export function pickFocalPolicy<T extends { focal?: boolean; policy: Policy }>(
  insurances: T[] | undefined
): Policy | undefined {
  if (!insurances || insurances.length === 0) return undefined;
  return insurances.find((i) => i.focal)?.policy ?? insurances[0]?.policy;
}
