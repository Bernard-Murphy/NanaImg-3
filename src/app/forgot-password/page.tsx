"use client";

import { useState, useEffect } from "react";
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

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset(
    $email: String!
    $username: String!
    $recaptchaToken: String
  ) {
    requestPasswordReset(
      email: $email
      username: $username
      recaptchaToken: $recaptchaToken
    )
  }
`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [requestPasswordReset] = useMutation(REQUEST_PASSWORD_RESET);

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
            { action: "forgot_password" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      await requestPasswordReset({
        variables: {
          email,
          username,
          recaptchaToken,
        },
      });

      setSubmitted(true);
      toast.success(
        "If an account exists, a password reset link will be sent to the email address."
      );
    } catch (error: any) {
      toast.warning(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your username and email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If an account with the provided username and email exists, a
                password reset link has been sent. Please check your email
                inbox.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Request Password Reset"}
              </Button>

              <div className="text-sm text-center">
                <Link href="/login" className="text-primary hover:underline">
                  Back to Login
                </Link>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This site is protected by reCAPTCHA, and the Google{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="underline"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/terms"
                  className="underline"
                >
                  Terms of Service
                </a>{" "}
                apply.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
