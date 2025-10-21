"use client";

import { useAuth } from "@/components/providers/auth";
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
  const auth = useAuth();
  const form = useForm<{ email: string; password: string }>();

  const handleSubmit = form.handleSubmit(async (data) => {
    await auth
      .login(data.email, data.password)
      .then(() => {
        router.push("/");
        toast.success("Logged in successfully!");
      })
      .catch(() => {
        toast.error("Login failed! Please try again later.");
      });
  });

  return (
    <Form {...form}>
      <form className={"h-dvh grid place-items-center"} onSubmit={handleSubmit}>
        <Card className={"w-100"}>
          <CardHeader>
            <CardTitle>Login into your account</CardTitle>
            <CardDescription>Enter your email and password to access your account.</CardDescription>
          </CardHeader>
          <CardContent className={"space-y-4"}>
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
            <Button className={"w-full"} type={"submit"} variant={"default"}>
              Login
            </Button>
            <Button className={"w-full"} type={"button"} variant={"outline"} asChild>
              <Link href={`${API_KEY}/login/google`}>Login with Google</Link>
            </Button>
            <p className={"mt-2 text-muted-foreground text-sm"}>
              Don't have an account?{" "}
              <Link className={"underline hover:text-foreground"} href={"/auth/new"}>
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}