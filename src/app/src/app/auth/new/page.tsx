"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { API_KEY } from "@/environment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();
  const form = useForm<{ email: string; password: string }>();

  const handleSubmit = form.handleSubmit(async (data) => {
    const response = await fetch(`${API_KEY}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      toast.success("Registered successfully! Please login to continue.");
      router.push("/auth");
    } else {
      toast.error("Failed to register. Please check your details and try again.");
    }
  });

  return (
    <Form {...form}>
      <form className={"h-dvh grid place-items-center"} onSubmit={handleSubmit}>
        <Card className={"w-100"}>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Enter your details in order to sign up on this platform.</CardDescription>
          </CardHeader>
          <CardContent className={"space-y-4"}>
            <FormField
              control={form.control}
              name={"email"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} type={"text"} placeholder={"John Doe"} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"email"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type={"email"} placeholder={"john@example.com"} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"password"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type={"password"} placeholder={"••••••••••••"} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className={"flex-col gap-2"}>
            <Button className={"w-full"} variant={"default"}>
              Register
            </Button>
            <p className={"mt-2 text-muted-foreground text-sm"}>
              Already have an account?{" "}
              <Link className={"underline hover:text-foreground"} href={"/auth"}>
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}