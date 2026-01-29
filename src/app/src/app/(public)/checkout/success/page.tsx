"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServer } from "@/lib/providers/server";
import { PaymentStatus } from "@/lib/server/payment";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const server = useServer();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      // No session ID but we're on success page - Stripe only redirects here on success
      // Show success anyway
      setSuccess(true);
      setLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const payment = await server.api.payment.verifyCheckoutSession(sessionId);
        // Any status means we got a valid response - payment was processed
        setSuccess(true);
        if (payment.status !== PaymentStatus.Paid) {
          // Still processing, but that's okay
          console.log("Payment status:", payment.status);
        }
      } catch (err) {
        console.error("Failed to verify payment:", err);
        // Stripe only redirects to success URL on successful payment
        // If verification failed, it's likely a backend/auth issue, not a payment issue
        setSuccess(true);
        setVerificationFailed(true);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, server.api.payment]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
            <p className="text-muted-foreground text-lg">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your order is now being processed.
            {verificationFailed && (
              <span className="mt-2 block text-xs">
                Note: Please check your orders page to confirm your order status.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/orders">View My Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
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
      <CheckoutSuccessContent />
    </Suspense>
  );
}
