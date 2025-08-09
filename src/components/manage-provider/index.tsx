import { Building2, Key, Plus, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Facility } from "@/types/facility";
import { apis } from "@/apis";
import { useState } from "react";

interface ManageProviderProps {
  facility: Facility;
  className?: string;
}

export default function ManageProvider({
  facility,
  className,
}: ManageProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    queryKey: ["provider", facility.id],
    queryFn: () => apis.provider.get(facility.id),
    enabled: !!facility.id,
  });

  const { data: healthFacility, isLoading: isHealthFacilityLoading } = useQuery(
    {
      queryKey: ["healthFacility", facility.id],
      queryFn: () => apis.healthFacility.get(facility.id),
      enabled: !!facility.id,
    }
  );

  const createProviderMutation = useMutation({
    mutationFn: () => apis.provider.create({ facility: facility.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", facility.id] });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: () =>
      apis.provider.update(facility.id, { regenerate_keys: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", facility.id] });
    },
  });

  const isLoading = isProviderLoading || isHealthFacilityLoading;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "cursor-pointer font-semibold border border-gray-400",
            className
          )}
          disabled={isOpen || !healthFacility}
          loading={isLoading}
        >
          {provider ? (
            <Settings className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {provider ? "Manage Provider" : "Create Provider"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Provider Management
          </DialogTitle>
          <DialogDescription>
            Manage your healthcare provider registration and credentials
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            <span className="ml-2">Loading provider information...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {provider ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <h3 className="font-medium text-green-900 mb-3">
                    Provider Registered
                  </h3>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs font-medium text-green-800">
                        Participant Code
                      </label>
                      <p className="text-sm text-green-900 bg-green-100 p-2 rounded border">
                        {provider.participant_code}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-green-800">
                        Registered On
                      </label>
                      <p className="text-sm text-green-900 bg-green-100 p-2 rounded border">
                        {formatDate(provider.created_date)}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => updateProviderMutation.mutate()}
                    disabled={updateProviderMutation.isPending}
                    loading={updateProviderMutation.isPending}
                    size="sm"
                    className="w-full"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Regenerate Keys
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="font-medium text-gray-900 mb-2">
                  No Provider Registered
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create a provider registration to start processing insurance
                  claims
                </p>
                <Button
                  onClick={() => createProviderMutation.mutate()}
                  disabled={createProviderMutation.isPending}
                  loading={createProviderMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Provider
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
