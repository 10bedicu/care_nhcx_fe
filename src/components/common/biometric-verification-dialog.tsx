import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { FingerprintIcon, ScanFaceIcon } from "lucide-react";
import { cn, toast } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { apis } from "@/apis";
import { useMutation } from "@tanstack/react-query";

type BiometricAuthMode = "FINGERPRINT" | "IRIS" | "FACE_AUTH";
type BiometricProcess = "Preauth" | "Discharge";
type DialogMode = "biometric" | "face";

const MAX_FACE_RETRIES = 3;
const FACE_POLL_INTERVAL_MS = 10000;

export interface BiometricVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  abhaNumber: string;
  payerId: string;
  process?: BiometricProcess;
  authMode?: BiometricAuthMode;
  claim?: string;
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
  authMode = "FINGERPRINT",
  claim,
  onVerifySuccess,
  onBypass,
}) => {
  const biometricAuthMode: BiometricAuthMode =
    authMode === "FACE_AUTH" ? "FINGERPRINT" : authMode;

  const [mode, setMode] = useState<DialogMode>(
    authMode === "FACE_AUTH" ? "face" : "biometric",
  );

  // Biometric (fingerprint) flow state
  const [txnId, setTxnId] = useState<string | null>(null);
  const [capturedAuthData, setCapturedAuthData] = useState<string>("");

  // Face flow state
  const [faceTxnId, setFaceTxnId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [faceError, setFaceError] = useState<string>("");
  const [faceRetryCount, setFaceRetryCount] = useState(0);

  const verifySucceededRef = useRef(false);

  const faceAuthUrl =
    window?.__CARE_PLUGIN_RUNTIME__?.meta?.care_nhcx_fe?.config?.faceAuthUrl;

  const verifyMutation = useMutation({
    mutationFn: apis.gateway.abhaBiometricAuthVerify,
    onSuccess: (data) => {
      toast.success(data.message || "Verification successful");
      onVerifySuccess?.(data.message);
      verifySucceededRef.current = true;
      onOpenChange(false);
    },
    onError: (error) => {
      const message = error.message || "Verification failed";
      setFaceError(message);
      toast.error(message);
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
        claim,
        txnId,
        authData: data,
        payerId,
        authMode: biometricAuthMode,
        process,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Fingerprint capture failed");
    },
  });

  // Face flow mutations
  const faceNhcxInitMutation = useMutation({
    mutationFn: apis.gateway.abhaBiometricAuthInit,
  });

  const facePidMutation = useMutation({
    mutationFn: apis.abdm.abhaFaceCapturePid,
    onSuccess: (data) => {
      if (data.status === "COMPLETE" || data.status === "COMPLETED") {
        setIsPolling(false);

        const rdPidData = data.rd_pid_data;
        if (!rdPidData) {
          const message = "Face capture completed but no PID data was returned";
          setFaceError(message);
          toast.error(message);
          return;
        }

        faceNhcxInitMutation.mutate(
          { abhaNumber, payerId, process, authMode: "FACE_AUTH" },
          {
            onSuccess: (initData) => {
              if (!initData.txnId) {
                const message =
                  initData.message || "Unable to initialize biometric auth";
                setFaceError(message);
                toast.error(message);
                return;
              }

              verifyMutation.mutate({
                encounter: encounterId,
                claim,
                txnId: initData.txnId,
                authData: rdPidData,
                payerId,
                authMode: "FACE_AUTH",
                process,
              });
            },
            onError: (error) => {
              const message = error.message || "Biometric init failed";
              setFaceError(message);
              toast.error(message);
            },
          },
        );
      } else if (data.status === "FAILED") {
        setIsPolling(false);
        const message = data.detail || "Face capture failed";
        setFaceError(message);
        toast.error(message);
      }
      // PENDING / VERIFIED -> keep polling
    },
    onError: (error) => {
      setIsPolling(false);
      const message = error.message || "Error capturing face PID";
      setFaceError(message);
      toast.error(message);
    },
  });

  const faceInitMutation = useMutation({
    mutationFn: apis.abdm.abhaFaceAuthInit,
    onSuccess: (data) => {
      if (!data.transaction_id) {
        const message =
          data.detail || "Unable to initialize face authentication";
        setFaceError(message);
        toast.error(message);
        return;
      }

      setFaceTxnId(data.transaction_id);
      setFaceError("");
      setIsPolling(true);
    },
    onError: (error) => {
      const message = error.message || "Failed to initiate face authentication";
      setFaceError(message);
      toast.error(message);
    },
  });

  const resetAll = () => {
    setTxnId(null);
    setCapturedAuthData("");
    setFaceTxnId(null);
    setIsPolling(false);
    setFaceError("");
    setFaceRetryCount(0);
    initMutation.reset();
    captureMutation.reset();
    verifyMutation.reset();
    faceInitMutation.reset();
    facePidMutation.reset();
    faceNhcxInitMutation.reset();
  };

  useEffect(() => {
    if (!open) {
      verifySucceededRef.current = false;
      resetAll();
      return;
    }

    if (mode === "biometric" && abhaNumber && payerId && !txnId) {
      initMutation.mutate({
        abhaNumber,
        payerId,
        process,
        authMode: biometricAuthMode,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, abhaNumber, payerId, process]);

  // Poll capturePID while face auth is awaiting the ABHA app scan
  useEffect(() => {
    if (!isPolling || !faceTxnId) {
      return;
    }

    const interval = setInterval(() => {
      facePidMutation.mutate({ transaction_id: faceTxnId });
    }, FACE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPolling, faceTxnId]);

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

  const faceStatus = useMemo(() => {
    if (
      faceNhcxInitMutation.isPending ||
      verifyMutation.isPending ||
      facePidMutation.isPending
    ) {
      return "pending";
    }

    if (verifyMutation.isSuccess) {
      return "success";
    }

    if (faceError) {
      return "error";
    }

    if (isPolling) {
      return "pending";
    }

    return "idle";
  }, [
    faceError,
    faceNhcxInitMutation.isPending,
    facePidMutation.isPending,
    isPolling,
    verifyMutation.isPending,
    verifyMutation.isSuccess,
  ]);

  const isFaceVerifying =
    faceNhcxInitMutation.isPending || verifyMutation.isPending;

  const showFaceInitButton =
    !isPolling &&
    !isFaceVerifying &&
    (!faceInitMutation.isSuccess ||
      (faceRetryCount < MAX_FACE_RETRIES && !!faceError));

  const handleFaceInit = () => {
    setFaceRetryCount((count) => count + 1);
    setFaceError("");
    setFaceTxnId(null);
    setIsPolling(false);
    faceInitMutation.reset();
    facePidMutation.reset();
    faceNhcxInitMutation.reset();
    verifyMutation.reset();
    faceInitMutation.mutate();
  };

  const handleModeChange = (nextMode: DialogMode) => {
    if (nextMode === mode || verifyMutation.isPending) {
      return;
    }
    resetAll();
    setMode(nextMode);
  };

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
          <DialogTitle>Consent Verification</DialogTitle>
          <DialogDescription>
            Verify the patient&apos;s consent using a biometric fingerprint scan
            or ABHA face authentication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary-100 p-1">
            <button
              type="button"
              onClick={() => handleModeChange("biometric")}
              disabled={verifyMutation.isPending}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "biometric"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-secondary-600 hover:text-secondary-800",
              )}
            >
              <FingerprintIcon className="h-4 w-4" />
              Biometric
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("face")}
              disabled={verifyMutation.isPending}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "face"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-secondary-600 hover:text-secondary-800",
              )}
            >
              <ScanFaceIcon className="h-4 w-4" />
              Face
            </button>
          </div>

          {mode === "biometric" && (
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
                  loading={
                    captureMutation.isPending || verifyMutation.isPending
                  }
                  disabled={!txnId || initMutation.isPending}
                >
                  Scan Fingerprint
                </Button>
              </div>
            </div>
          )}

          {mode === "face" && (
            <div className="rounded-md border border-dashed p-6">
              <div className="flex flex-col items-center justify-center gap-4">
                {faceInitMutation.isSuccess && faceTxnId && !faceError ? (
                  <>
                    {faceAuthUrl ? (
                      <QRCodeSVG
                        value={`${faceAuthUrl}?txnId=${faceTxnId}`}
                        className="size-56 rounded-lg"
                      />
                    ) : (
                      <div className="rounded-md bg-secondary-50 p-4 text-center text-xs text-secondary-600">
                        Face auth URL is not configured. Transaction ID:
                        <span className="mt-1 block break-all font-mono text-secondary-800">
                          {faceTxnId}
                        </span>
                      </div>
                    )}
                    <p className="text-center text-sm text-secondary-600">
                      {isFaceVerifying
                        ? "Verifying face data..."
                        : "Scan this QR with the ABHA app and complete face capture."}
                    </p>
                  </>
                ) : (
                  <div
                    className={cn(
                      "flex h-24 w-24 items-center justify-center rounded-full bg-primary-50",
                      faceStatus === "success" && "bg-green-50",
                      faceStatus === "error" && "bg-red-50",
                    )}
                  >
                    <ScanFaceIcon
                      className={cn(
                        "h-10 w-10",
                        faceStatus === "success" && "text-green-600",
                        faceStatus === "error" && "text-red-600",
                        ["idle", "pending"].includes(faceStatus) &&
                          "text-primary-500",
                      )}
                    />
                  </div>
                )}

                <div className="text-center">
                  {faceInitMutation.isPending && (
                    <p className="text-sm text-secondary-600">
                      Initializing face authentication...
                    </p>
                  )}
                  {verifyMutation.isSuccess && (
                    <p className="text-sm text-green-700">
                      Face verification completed.
                    </p>
                  )}
                  {faceError && (
                    <p className="text-sm text-red-600">{faceError}</p>
                  )}
                </div>

                {showFaceInitButton && (
                  <Button
                    type="button"
                    onClick={handleFaceInit}
                    loading={faceInitMutation.isPending}
                  >
                    {faceRetryCount === 0
                      ? "Initiate Face Authentication"
                      : "Retry Face Authentication"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {onBypass && (
            <div className="flex justify-center">
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BiometricVerificationDialog;
