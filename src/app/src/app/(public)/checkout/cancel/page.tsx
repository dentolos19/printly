"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <XCircle className="h-10 w-10 text-yellow-600" />
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
              <Link href="/orders">Return to Orders</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/">Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
              <p className="text-muted-foreground text-lg">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CheckoutCancelContent />
    </Suspense>
  );
}
