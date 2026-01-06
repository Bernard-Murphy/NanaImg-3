"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gql, useMutation, useLazyQuery } from "@apollo/client";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!, $recaptchaToken: String) {
    register(input: $input, recaptchaToken: $recaptchaToken) {
      success
      message
      user {
        id
        username
      }
    }
  }
`;

const CHECK_IMAGE_FILE = gql`
  query CheckImageFile($fileId: Int!) {
    checkImageFile(fileId: $fileId)
  }
`;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFileId, setAvatarFileId] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarValid, setAvatarValid] = useState(true);

  const [register] = useMutation(REGISTER_MUTATION);
  const [checkImageFile] = useLazyQuery(CHECK_IMAGE_FILE);

  useEffect(() => {
    // Load reCAPTCHA if site key is available
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const checkAvatar = async () => {
      if (!avatarFileId) {
        setAvatarValid(true);
        return;
      }

      const fileId = parseInt(avatarFileId);
      if (isNaN(fileId)) {
        setAvatarValid(false);
        return;
      }

      try {
        const { data } = await checkImageFile({ variables: { fileId } });
        setAvatarValid(!!data?.checkImageFile);
      } catch {
        setAvatarValid(false);
      }
    };

    const timeoutId = setTimeout(checkAvatar, 500);
    return () => clearTimeout(timeoutId);
  }, [avatarFileId, checkImageFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }

    if (avatarFileId && !avatarValid) {
      toast.warning("Avatar must be a valid image file ID.");
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
            { action: "register" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      const { data } = await register({
        variables: {
          input: {
            username,
            displayName,
            email,
            password,
            bio: bio || "",
            avatar:
              avatarFileId && avatarFileId.trim()
                ? parseInt(avatarFileId)
                : null,
          },
          recaptchaToken,
        },
      });

      if (data.register.success) {
        toast.success("Account created successfully! You are now logged in.");
        router.push("/");
      } else {
        toast.warning(data.register.message || "An error occurred.");
      }
    } catch (error: any) {
      toast.warning(error.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
                placeholder="Tell us about yourself (optional)"
              />
            </div>

            <div>
              <Label htmlFor="avatar">Avatar (File ID)</Label>
              <Input
                id="avatar"
                type="number"
                value={avatarFileId}
                onChange={(e) => setAvatarFileId(e.target.value)}
                disabled={loading}
                placeholder="Enter a file ID for your avatar (optional)"
              />
              {avatarFileId && !avatarValid && (
                <p className="text-sm text-destructive mt-1">
                  This is not a valid image file ID
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading || (avatarFileId.trim().length > 0 && !avatarValid)
              }
            >
              {loading ? "Creating account..." : "Register"}
            </Button>

            <div className="text-sm text-center">
              <Link href="/login" className="text-primary hover:underline">
                Already have an account? Login
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
