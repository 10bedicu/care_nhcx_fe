import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FC, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "../ui/button";
import { CheckCircleIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PaymentReconciliation } from "@/types/payment";
import { Task } from "@/types/task";
import { apis } from "@/apis";
import { toast } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const acknowledgePaymentFormSchema = z.object({
  acknowledged_amount: z.number().min(0.01, "Amount must be greater than 0"),
});

interface AcknowledgePaymentModalProps {
  task: Task;
  paymentNotice: PaymentReconciliation;
}

const AcknowledgePaymentModal: FC<AcknowledgePaymentModalProps> = ({
  task,
  paymentNotice,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof acknowledgePaymentFormSchema>>({
    resolver: zodResolver(acknowledgePaymentFormSchema),
    defaultValues: {
      acknowledged_amount: undefined,
    },
  });

  const { mutate: acknowledgePayment, isPending } = useMutation({
    mutationFn: apis.payment.acknowledge,
    onSuccess: () => {
      form.reset();
      toast.success("Payment acknowledged successfully");
      setIsOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["tasks", task.claim],
      });
    },
    onError: (error) => {
      console.error("Error acknowledging payment:", error);
      toast.error("Failed to acknowledge payment");
    },
  });

  const onSubmit = async () => {
    try {
      acknowledgePayment(paymentNotice.id);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  };

  const formatCurrency = (
    amount: number | undefined,
    currency: string = "INR"
  ) => {
    if (amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const expectedAmount = paymentNotice.payment_amount?.value || 0;
  const acknowledgedAmount = form.watch("acknowledged_amount");
  const isAmountMatching = Math.abs(expectedAmount - acknowledgedAmount) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircleIcon className="w-5 h-5" />
          Acknowledge Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Acknowledge Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="flex flex-col">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Payment Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">
                        Expected Amount:
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(
                          expectedAmount,
                          paymentNotice.payment_amount?.currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">
                        Payment Date:
                      </span>
                      <span className="text-sm text-blue-900">
                        {paymentNotice.payment_date
                          ? new Date(
                              paymentNotice.payment_date
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    {paymentNotice.payment_identifier && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">
                          Payment ID:
                        </span>
                        <span className="text-sm font-mono text-blue-900">
                          {paymentNotice.payment_identifier}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="acknowledged_amount"
                      className="text-sm font-medium"
                    >
                      Amount Received
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="acknowledged_amount"
                        placeholder="Enter the amount you received"
                        className="pr-12"
                        onKeyPress={(e) => {
                          const allowedKeys = [
                            "0",
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            ".",
                            "Backspace",
                            "Delete",
                            "Tab",
                            "Enter",
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                          if (
                            e.key === "." &&
                            (e.target as HTMLInputElement).value.includes(".")
                          ) {
                            e.preventDefault();
                          }
                        }}
                        {...form.register("acknowledged_amount", {
                          valueAsNumber: true,
                        })}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 text-sm font-medium">
                          {paymentNotice.payment_amount?.currency || "INR"}
                        </span>
                      </div>
                    </div>
                    {form.formState.errors.acknowledged_amount && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.acknowledged_amount.message}
                      </p>
                    )}
                  </div>

                  <div
                    className={`rounded-lg p-3 border ${
                      isAmountMatching
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon
                        className={`w-4 h-4 ${
                          isAmountMatching
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isAmountMatching
                            ? "text-green-800"
                            : "text-yellow-800"
                        }`}
                      >
                        {isAmountMatching
                          ? "Amount matches expected payment"
                          : "Amount differs from expected payment"}
                      </span>
                    </div>
                    {!isAmountMatching && (
                      <p className="text-xs text-yellow-700 mt-1">
                        Please verify the amount received matches the expected
                        payment
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="submit"
              className="flex items-center space-x-2"
              disabled={isPending || !isAmountMatching}
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>
                {isPending ? "Acknowledging..." : "Acknowledge Payment"}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AcknowledgePaymentModal;
