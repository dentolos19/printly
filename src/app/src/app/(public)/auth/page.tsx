"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/environment";
import { useAuth } from "@/lib/providers/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Page() {
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      await auth.login(data.email, data.password);
      toast.success("Welcome back! Logging you in...");
      router.push("/");
    } catch (error) {
      toast.error("Invalid email or password. Please try again.");
      form.setError("root", {
        message: "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  });

  const handleGoogle = () => {
    const returnUrl = `${window.location.origin}/auth/callback`;
    window.location.href = `${API_URL}/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <Form {...form}>
      <form className={"grid h-dvh place-items-center p-4"} onSubmit={handleSubmit}>
        <Card className={"w-full max-w-md"}>
          <CardHeader className={"space-y-1"}>
            <CardTitle className={"text-2xl"}>Welcome back</CardTitle>
            <CardDescription>Enter your email and password to access your account</CardDescription>
          </CardHeader>
          <CardContent className={"space-y-4"}>
            <FormField
              control={form.control}
              name={"email"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type={"email"} placeholder={"john@example.com"} disabled={isLoading} />
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
                    <Input {...field} type={"password"} placeholder={"••••••••••••"} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className={"flex-col gap-3"}>
            <Button className={"w-full"} type={"submit"} variant={"default"} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <div className={"relative w-full"}>
              <div className={"absolute inset-0 flex items-center"}>
                <span className={"w-full border-t"} />
              </div>
              <div className={"relative flex justify-center text-xs uppercase"}>
                <span className={"bg-card text-muted-foreground px-2"}>Or continue with</span>
              </div>
            </div>
            <Button
              className={"w-full"}
              type={"button"}
              variant={"outline"}
              onClick={handleGoogle}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <p className={"text-muted-foreground text-center text-sm"}>
              Don't have an account?{" "}
              <Link className={"hover:text-foreground font-medium underline underline-offset-4"} href={"/auth/new"}>
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
