import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ClaimConsentStage } from "@/types/claim_consent";
import { FingerprintIcon } from "lucide-react";
import { apis } from "@/apis";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";

type BiometricAuthMode = "FINGERPRINT" | "IRIS" | "FACE_AUTH";
type BiometricProcess = "Preauth" | "Discharge";

export interface BiometricVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  abhaNumber: string;
  payerId: string;
  process?: BiometricProcess;
  stage: ClaimConsentStage;
  authMode?: BiometricAuthMode;
  onVerifySuccess?: (message: string) => void;
  onBypass?: () => void;
}

export const BiometricVerificationDialog: FC<
  BiometricVerificationDialogProps
> = ({
  open,
  onOpenChange,
  encounterId,
  abhaNumber,
  payerId,
  process = "Preauth",
  stage,
  authMode = "FINGERPRINT",
  onVerifySuccess,
  onBypass,
}) => {
  const [txnId, setTxnId] = useState<string | null>(null);
  const [capturedAuthData, setCapturedAuthData] = useState<string>("");
  const verifySucceededRef = useRef(false);

  const verifyMutation = useMutation({
    mutationFn: apis.gateway.abhaBiometricAuthVerify,
    onSuccess: (data) => {
      toast.success(data.message || "Biometric verification successful");
      onVerifySuccess?.(data.message);
      verifySucceededRef.current = true;
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Biometric verification failed");
    },
  });

  const captureMutation = useMutation({
    mutationFn: apis.rdService.capture,
    onSuccess: (data) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "text/xml");
      const respElement = xmlDoc.getElementsByTagName("Resp")[0];
      const errorCode = respElement?.getAttribute("errCode");

      if (errorCode !== "0") {
        const errorMessage =
          respElement?.getAttribute("errInfo") ?? "Fingerprint capture failed";
        toast.error(errorMessage);
        return;
      }

      setCapturedAuthData(data);
      if (!txnId) {
        toast.error("Missing transaction id for verification");
        return;
      }

      verifyMutation.mutate({
        encounter: encounterId,
        txnId,
        authData: data,
        payerId,
        authMode,
        process,
        stage,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Fingerprint capture failed");
    },
  });

  const initMutation = useMutation({
    mutationFn: apis.gateway.abhaBiometricAuthInit,
    onSuccess: (data) => {
      if (!data.txnId) {
        toast.error(data.message || "Unable to initialize biometric auth");
        return;
      }

      setTxnId(data.txnId);
      toast.success(data.message || "Biometric auth initialized");
    },
    onError: (error) => {
      toast.error(error.message || "Biometric init failed");
    },
  });

  useEffect(() => {
    if (!open) {
      verifySucceededRef.current = false;
      setTxnId(null);
      setCapturedAuthData("");
      initMutation.reset();
      captureMutation.reset();
      verifyMutation.reset();
      return;
    }

    if (open && abhaNumber && payerId) {
      initMutation.mutate({
        abhaNumber,
        payerId,
        process,
        authMode,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, abhaNumber, payerId, process, authMode]);

  const fingerprintStatus = useMemo(() => {
    if (captureMutation.isPending || verifyMutation.isPending) {
      return "pending";
    }

    if (verifyMutation.isSuccess) {
      return "success";
    }

    if (captureMutation.isError || verifyMutation.isError) {
      return "error";
    }

    if (capturedAuthData) {
      return "success";
    }

    return "idle";
  }, [
    captureMutation.isError,
    captureMutation.isPending,
    capturedAuthData,
    verifyMutation.isError,
    verifyMutation.isPending,
    verifyMutation.isSuccess,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !verifySucceededRef.current) {
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        hideCloseButton
        onPointerDownOutside={(e) => {
          if (!verifySucceededRef.current) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!verifySucceededRef.current) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Biometric Verification</DialogTitle>
          <DialogDescription>
            We initialize biometric auth first. After that, scan fingerprint to
            complete verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-dashed p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-full bg-primary-50",
                  fingerprintStatus === "success" && "bg-green-50",
                  fingerprintStatus === "error" && "bg-red-50",
                )}
              >
                <FingerprintIcon
                  className={cn(
                    "h-10 w-10",
                    fingerprintStatus === "success" && "text-green-600",
                    fingerprintStatus === "error" && "text-red-600",
                    ["idle", "pending"].includes(fingerprintStatus) &&
                      "text-primary-500",
                  )}
                />
              </div>

              <div className="text-center">
                {initMutation.isPending && (
                  <p className="text-sm text-secondary-600">
                    Initializing biometric session...
                  </p>
                )}
                {initMutation.isSuccess && !!txnId && (
                  <p className="text-sm text-secondary-600">
                    Ready to scan fingerprint.
                  </p>
                )}
                {verifyMutation.isPending && (
                  <p className="text-sm text-secondary-600">
                    Verifying biometric data...
                  </p>
                )}
                {verifyMutation.isSuccess && (
                  <p className="text-sm text-green-700">
                    Biometric verification completed.
                  </p>
                )}
                {(initMutation.isError || captureMutation.isError) && (
                  <p className="text-sm text-red-600">
                    Please retry biometric verification.
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={() => {
                  captureMutation.mutate();
                }}
                loading={captureMutation.isPending || verifyMutation.isPending}
                disabled={!txnId || initMutation.isPending}
              >
                Scan Fingerprint
              </Button>
              {onBypass && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    verifySucceededRef.current = true;
                    onBypass();
                  }}
                >
                  Skip Verification
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BiometricVerificationDialog;
