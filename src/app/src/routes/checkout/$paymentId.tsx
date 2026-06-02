import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { useAuth } from "#/lib/providers/auth";
import { useServer } from "#/lib/providers/server";
import { PaymentStatus, type PaymentResponse } from "#/lib/server/payment";

export const Route = createFileRoute("/checkout/$paymentId")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { paymentId } = Route.useParams();
  const { claims } = useAuth();
  const server = useServer();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);

  useEffect(() => {
    const loadPayment = async () => {
      try {
        const result = await server.api.payment.verifyPayment(paymentId);
        if (result.status === PaymentStatus.Paid) {
          navigate({ search: { payment_id: result.id }, to: "/checkout/success", replace: true });
          return;
        }
        setPayment(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Checkout could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPayment();
  }, [navigate, paymentId, server.api.payment]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPaying(true);

    try {
      const result = await server.api.payment.completePayment(paymentId);
      navigate({ search: { payment_id: result.id }, to: "/checkout/success", replace: true });
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Payment could not be completed.");
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Alert className="max-w-md" variant="destructive">
          <AlertTitle>Checkout unavailable</AlertTitle>
          <AlertDescription className="flex flex-col gap-4">
            {error ?? "This payment could not be found."}
            <Button asChild variant="outline">
              <Link to="/orders">Return to orders</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const total = new Intl.NumberFormat("en-SG", {
    currency: payment.currency.toUpperCase(),
    style: "currency",
  }).format(payment.amount);

  return (
    <main className="bg-muted/30 min-h-dvh">
      <header className="bg-background border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/">
            <img alt="Printly" className="size-7" height={28} src="/icon.png" width={28} />
            Printly checkout
          </Link>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <LockKeyhole className="size-4" aria-hidden="true" />
            Private checkout
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(26rem,1fr)] lg:py-16">
        <section className="flex flex-col gap-8 lg:pt-6">
          <Button asChild className="w-fit" size="sm" variant="ghost">
            <Link search={{ order_id: payment.orderId }} to="/checkout/cancel">
              <ArrowLeft data-icon="inline-start" />
              Back
            </Link>
          </Button>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">Order {payment.orderId.slice(0, 8)}</p>
            <p className="text-4xl font-semibold tracking-tight">{total}</p>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Printly order</span>
              <span>{total}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Total due</span>
              <span>{total}</span>
            </div>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pay securely</CardTitle>
            <CardDescription>Complete your order without leaving Printly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="payment-form" onSubmit={handleSubmit}>
              <FieldGroup>
                <Alert>
                  <ShieldCheck aria-hidden="true" />
                  <AlertTitle>Test payment</AlertTitle>
                  <AlertDescription>
                    Use any validly formatted details. Card details are validated in your browser and discarded.
                  </AlertDescription>
                </Alert>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input autoComplete="email" defaultValue={claims?.email} id="email" required type="email" />
                </Field>

                <FieldSet>
                  <FieldLegend>Card information</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="card-number">Card number</FieldLabel>
                      <Input
                        autoComplete="cc-number"
                        id="card-number"
                        inputMode="numeric"
                        maxLength={19}
                        minLength={15}
                        pattern="[0-9 ]+"
                        placeholder="4242 4242 4242 4242"
                        required
                      />
                    </Field>
                    <FieldGroup className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="expiry">Expiry</FieldLabel>
                        <Input
                          autoComplete="cc-exp"
                          id="expiry"
                          inputMode="numeric"
                          pattern="(0[1-9]|1[0-2]) ?/ ?[0-9]{2}"
                          placeholder="MM / YY"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="cvc">CVC</FieldLabel>
                        <Input
                          autoComplete="cc-csc"
                          id="cvc"
                          inputMode="numeric"
                          maxLength={4}
                          minLength={3}
                          pattern="[0-9]+"
                          placeholder="123"
                          required
                        />
                      </Field>
                    </FieldGroup>
                  </FieldGroup>
                </FieldSet>

                <Field>
                  <FieldLabel htmlFor="card-name">Name on card</FieldLabel>
                  <Input autoComplete="cc-name" id="card-name" required />
                  <FieldDescription>This information is not saved.</FieldDescription>
                </Field>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Payment failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" disabled={isPaying} form="payment-form" size="lg" type="submit">
              {isPaying ? <Spinner data-icon="inline-start" /> : <CreditCard data-icon="inline-start" />}
              {isPaying ? "Processing" : `Pay ${total}`}
            </Button>
            <p className="text-muted-foreground text-center text-xs">No card details are sent or stored.</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
