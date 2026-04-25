"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { useAuth } from "#/lib/providers/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

type RegisterForm = z.infer<typeof registerSchema>;

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={"flex items-center gap-2 text-xs"}>
      {met ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}

export const Route = createFileRoute("/auth/new")({
  component: RegistrationPage,
});

function RegistrationPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const password = form.watch("password");
  const passwordRequirements = {
    length: password?.length >= 8,
    lowercase: /[a-z]/.test(password || ""),
    uppercase: /[A-Z]/.test(password || ""),
    number: /[0-9]/.test(password || ""),
    special: /[^a-zA-Z0-9]/.test(password || ""),
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      await auth.register(data.name, data.email, data.password);
      toast.success("Account created successfully! Please log in.");
      navigate({ to: "/auth" });
    } catch (error) {
      toast.error("Registration failed. Email may already be in use.");
      form.setError("root", {
        message: "Failed to create account",
      });
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Form {...form}>
      <form className={"grid h-dvh place-items-center p-4"} onSubmit={handleSubmit}>
        <Card className={"w-full max-w-md"}>
          <CardHeader className={"space-y-1"}>
            <CardTitle className={"text-2xl"}>Create an account</CardTitle>
            <CardDescription>Enter your details to get started with Printly</CardDescription>
          </CardHeader>
          <CardContent className={"space-y-4"}>
            <FormField
              control={form.control}
              name={"name"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} placeholder={"John Doe"} type={"text"} />
                  </FormControl>
                  <FormMessage />
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
                    <Input {...field} disabled={isLoading} placeholder={"john@example.com"} type={"email"} />
                  </FormControl>
                  <FormMessage />
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
                    <Input {...field} disabled={isLoading} placeholder={"Create a strong password"} type={"password"} />
                  </FormControl>
                  <FormDescription>
                    <div className={"mt-2 space-y-1"}>
                      <PasswordRequirement met={passwordRequirements.length} text={"At least 8 characters"} />
                      <PasswordRequirement met={passwordRequirements.lowercase} text={"One lowercase letter"} />
                      <PasswordRequirement met={passwordRequirements.uppercase} text={"One uppercase letter"} />
                      <PasswordRequirement met={passwordRequirements.number} text={"One number"} />
                      <PasswordRequirement met={passwordRequirements.special} text={"One special character"} />
                    </div>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className={"flex-col gap-3"}>
            <Button className={"w-full"} disabled={isLoading} type={"submit"} variant={"default"}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
            <p className={"text-center text-muted-foreground text-sm"}>
              Already have an account?{" "}
              <Link className={"font-medium underline underline-offset-4 hover:text-foreground"} to="/auth">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
