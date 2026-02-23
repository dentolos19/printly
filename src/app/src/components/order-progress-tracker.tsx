"use client";

import { cn } from "@/lib/utils";
import { OrderStatus } from "@/lib/server/order";
import { CheckCircle2, Circle, Clock, CreditCard, Package, RotateCcw, Truck, XCircle } from "lucide-react";

interface OrderProgressTrackerProps {
  status: OrderStatus;
  className?: string;
}

const orderStages = [
  {
    status: OrderStatus.PendingPayment,
    label: "Payment",
    icon: Clock,
    description: "Awaiting payment",
  },
  {
    status: OrderStatus.Paid,
    label: "Paid",
    icon: CreditCard,
    description: "Payment received",
  },
  {
    status: OrderStatus.Processing,
    label: "Processing",
    icon: Package,
    description: "Preparing order",
  },
  {
    status: OrderStatus.Shipped,
    label: "Shipped",
    icon: Truck,
    description: "On the way",
  },
  {
    status: OrderStatus.Delivered,
    label: "Delivered",
    icon: CheckCircle2,
    description: "Order complete",
  },
];

export function OrderProgressTracker({ status, className }: OrderProgressTrackerProps) {
  // Handle cancelled orders
  if (status === OrderStatus.Cancelled) {
    return (
      <div
        className={cn(
          "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">Order Cancelled</p>
            <p className="text-sm text-red-600 dark:text-red-400">This order has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle refund-related statuses
  if (status === OrderStatus.RefundRequested) {
    return (
      <div
        className={cn(
          "rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/50",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
            <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-300">Refund Requested</p>
            <p className="text-sm text-orange-600 dark:text-orange-400">Your refund request is being reviewed</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === OrderStatus.RefundApproved) {
    return (
      <div
        className={cn(
          "rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Refund Approved</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Your refund has been approved and is being processed
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === OrderStatus.Refunded) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">Refunded</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">This order has been refunded</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current stage index
  const currentStageIndex = orderStages.findIndex((stage) => stage.status === status);

  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <h4 className="text-muted-foreground mb-4 text-sm font-medium">Order Progress</h4>

      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="bg-muted absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 rounded-full" />
        <div
          className="bg-primary absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{
            width: `${(currentStageIndex / (orderStages.length - 1)) * 100}%`,
          }}
        />

        {/* Stage markers */}
        <div className="relative flex justify-between">
          {orderStages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isPending = index > currentStageIndex;
            const StageIcon = stage.icon;

            return (
              <div key={stage.status} className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary text-primary-foreground ring-primary/20 ring-4",
                    isPending && "border-muted-foreground/30 bg-background text-muted-foreground/50",
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <StageIcon className="h-4 w-4" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage labels */}
      <div className="flex justify-between">
        {orderStages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <div key={stage.status} className="flex flex-col items-center text-center" style={{ width: "60px" }}>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {stage.label}
              </span>
              {isCurrent && <span className="text-muted-foreground mt-0.5 text-[10px]">{stage.description}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
