"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gql, useMutation } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LOGIN_MUTATION = gql`
  mutation Login(
    $username: String!
    $password: String!
    $recaptchaToken: String
  ) {
    login(
      username: $username
      password: $password
      recaptchaToken: $recaptchaToken
    ) {
      success
      message
      user {
        id
        username
      }
    }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [login] = useMutation(LOGIN_MUTATION);

  useEffect(() => {
    // Load reCAPTCHA if site key is available
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get reCAPTCHA token if available
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "login" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      const { data } = await login({
        variables: {
          username,
          password,
          recaptchaToken,
        },
      });

      if (data.login.success) {
        toast.success("You have been logged in successfully.");
        router.push("/");
      } else {
        toast.warning(data.login.message || "Invalid credentials.");
      }
    } catch (error: any) {
      toast.warning(error.message || "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-sm text-center space-y-2">
              <div>
                <Link href="/register" className="text-primary hover:underline">
                  Don&apos;t have an account? Register
                </Link>
              </div>
              <div>
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This site is protected by reCAPTCHA, and the Google&apos;{" "}
              <a
                href="https://policies.google.com/privacy"
                className="underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="https://policies.google.com/terms" className="underline">
                Terms of Service
              </a>{" "}
              apply.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
