"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";

const RESET_PASSWORD = gql`
  mutation ResetPassword(
    $resetId: String!
    $password: String!
    $recaptchaToken: String
  ) {
    resetPassword(
      resetId: $resetId
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

export default function SetPasswordPageClient() {
  const router = useRouter();
  const params = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetId = params.id as string;

  const [resetPassword] = useMutation(RESET_PASSWORD);

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

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }

    if (password.length < 4) {
      toast.warning("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);

    try {
      // Get reCAPTCHA token if available
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "reset_password" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      const { data } = await resetPassword({
        variables: {
          resetId,
          password,
          recaptchaToken,
        },
      });

      if (data.resetPassword.success) {
        toast.success("Password reset successfully! You are now logged in.");
        router.push(`/u/${data.resetPassword.user.username}`);
      } else {
        toast.warning(
          data.resetPassword.message || "Failed to reset password."
        );
      }
    } catch (error: any) {
      toast.warning(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-16"
    >
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={4}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This site is protected by reCAPTCHA, and the Google{" "}
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
    </motion.div>
  );
}
