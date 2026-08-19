import { RefreshCwIcon, WalletIcon } from "lucide-react";

import { CoverageEligibilityRequest } from "@/types/coverage_eligibility";
import { FC } from "react";
import { cn, formatCurrency, toast } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { apis } from "@/apis";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface WalletBalanceCardProps {
  request?: CoverageEligibilityRequest;
  encounterId: string;
}

export const WalletBalanceCard: FC<WalletBalanceCardProps> = ({
  request,
  encounterId,
}) => {
  const queryClient = useQueryClient();

  const { mutate: refreshWalletBalance, isPending: isSubmitting } = useMutation(
    {
      // Clone the latest validation request's policy into a fresh automatic
      // wallet check and submit it. The backend marks it is_automatic so it
      // refreshes the balance here without adding a new timeline entry.
      mutationFn: () =>
        apis.coverageEligibilityRequest.walletCheck(request!.id),
      onSuccess: () => {
        toast.success("Coverage balance check submitted to payer");
        queryClient.invalidateQueries({
          queryKey: ["coverage-eligibility-requests", encounterId],
        });
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to submit coverage balance check");
      },
    },
  );

  if (!request) return null;

  const response = request.latest_response;
  const insurances = response?.insurances ?? [];
  const primary = insurances.find((e) => e.is_primary) ?? insurances[0];

  const isAwaiting =
    !response ||
    response.outcome === "queued" ||
    response.outcome === "partial";
  const isError = response?.outcome === "error";
  const hasBalance = !!primary?.balance;

  const canRefresh = (request.insurance?.length ?? 0) > 0;
  const isRefreshing = isSubmitting || isAwaiting;

  // Family wallet is shared: the allowed limit is per-family (take the primary
  // member's allowed) while used is summed across all members.
  const familyAllowed = primary?.balance?.allowed.value ?? 0;
  const familyUsed = insurances.reduce(
    (sum, e) => sum + (e.balance?.used.value ?? 0),
    0,
  );
  const remaining = familyAllowed - familyUsed;
  const isLow = hasBalance && remaining < familyAllowed * 0.2;

  const lastChecked =
    response?.created_date ?? request.dispatched_at ?? request.created_date;
  const lastCheckedRelative = lastChecked
    ? formatDistanceToNow(new Date(lastChecked), { addSuffix: true })
    : null;

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WalletIcon className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-900">Wallet Balance</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-blue-700">
          {isSubmitting ? (
            <span>Submitting…</span>
          ) : isAwaiting ? (
            <span>Refreshing…</span>
          ) : lastCheckedRelative ? (
            <span>Last checked {lastCheckedRelative}</span>
          ) : null}
          <button
            type="button"
            onClick={() => refreshWalletBalance()}
            disabled={!canRefresh || isRefreshing}
            title="Run a new coverage balance check"
            aria-label="Run a new coverage balance check"
            className={cn(
              "flex items-center justify-center rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <RefreshCwIcon
              className={cn("w-4 h-4", isRefreshing && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-700">
          The payer could not return the wallet balance. Run a coverage balance
          check to try again.
        </p>
      )}

      {!isError && !hasBalance && isAwaiting && (
        <p className="text-sm text-blue-800">
          Waiting for the payer to confirm the latest wallet balance.
        </p>
      )}

      {!isError && !hasBalance && !isAwaiting && (
        <p className="text-sm text-blue-800">
          No wallet balance was returned for this policy.
        </p>
      )}

      {hasBalance && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 font-medium">Total Allowed</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">
              {formatCurrency(familyAllowed)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 font-medium">Total Used</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">
              {formatCurrency(familyUsed)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg p-3 text-center shadow-sm",
              isLow ? "bg-red-100" : "bg-green-100",
            )}
          >
            <p className="text-xs text-gray-500 font-medium">Remaining</p>
            <p
              className={cn(
                "text-base font-bold mt-0.5",
                isLow ? "text-red-700" : "text-green-700",
              )}
            >
              {formatCurrency(remaining)}
            </p>
            {isLow && (
              <p className="text-xs text-red-600 mt-0.5">Low balance</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletBalanceCard;
