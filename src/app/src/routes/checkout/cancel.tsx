"use client";

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Loader2, XCircle } from "lucide-react";
import { Suspense } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";

function CheckoutCancelContent() {
  const search = useSearch({ strict: false }) as Record<string, string | undefined>;
  const orderId = search["order_id"];

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/50">
            <XCircle className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges have been made. Your order is still pending and you can try again
            when you&apos;re ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orderId && (
            <Button asChild>
              <Link to="/orders">Return to Orders</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancelPage,
});

function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CheckoutCancelContent />
    </Suspense>
  );
}
