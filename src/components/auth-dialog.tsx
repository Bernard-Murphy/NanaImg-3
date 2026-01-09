"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql, useMutation, useLazyQuery } from "@apollo/client";
import { ME_QUERY } from "@/components/navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogIn, UserPlus, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  normalize,
  fade_out,
  transition_fast,
  fade_out_scale_1,
} from "@/lib/transitions";
import BouncyClick from "@/components/ui/bouncy-click";
import Spinner from "@/components/ui/spinner";

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    displayName: z.string().min(1, "Display name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(4, "Password must be at least 4 characters"),
    confirmPassword: z.string(),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    avatarFileId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Please enter a valid email address"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

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
      token
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!, $recaptchaToken: String) {
    register(input: $input, recaptchaToken: $recaptchaToken) {
      success
      message
      user {
        id
        username
      }
      token
    }
  }
`;

const CHECK_IMAGE_FILE = gql`
  query CheckImageFile($fileId: Int!) {
    checkImageFile(fileId: $fileId)
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = gql`
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

interface AuthDialogProps {
  children?: React.ReactNode;
  defaultTab?: "login" | "register" | "forgot";
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
}

function AuthDialogContent({
  children,
  defaultTab = "login",
  onSuccess,
  open: externalOpen,
  onOpenChange,
  onCancel,
}: AuthDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Form hooks
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      bio: "",
      avatarFileId: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  const [avatarValid, setAvatarValid] = useState(true);

  const [login] = useMutation(LOGIN_MUTATION);
  const [register] = useMutation(REGISTER_MUTATION);
  const [requestPasswordReset] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);
  const [checkImageFile] = useLazyQuery(CHECK_IMAGE_FILE);
  const [refetchMe] = useLazyQuery(ME_QUERY);

  useEffect(() => {
    // Load reCAPTCHA if site key is available
    if (
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
      !document.querySelector('script[src*="recaptcha"]')
    ) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const checkAvatar = async () => {
      const avatarFileId = registerForm.watch("avatarFileId");
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
  }, [registerForm.watch("avatarFileId"), checkImageFile]);

  const saveAuthToken = (token: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth-token", token);
    document.cookie = `auth-token=${token}; path=/; max-age=2592000; samesite=lax${
      process.env.NODE_ENV === "production" ? "; secure" : ""
    }`;
  };

  const handleLogin = async (data: LoginForm) => {
    try {
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

      const { data: response } = await login({
        variables: {
          username: data.username,
          password: data.password,
          recaptchaToken,
        },
      });
      console.log("response", response);
      if (response.login.success) {
        toast.success("You have been logged in successfully.");
        // Store JWT token in localStorage
        if (response.login.token) {
          saveAuthToken(response.login.token);
        }
        // Refetch user data to update authentication state
        await refetchMe();
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(response.login.message || "Invalid credentials.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during login.");
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    if (data.avatarFileId && !avatarValid) {
      toast.error("Avatar must be a valid image file ID.");
      return;
    }

    try {
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

      const { data: response } = await register({
        variables: {
          input: {
            username: data.username,
            displayName: data.displayName,
            email: data.email,
            password: data.password,
            bio: data.bio || "",
            avatar:
              data.avatarFileId && data.avatarFileId.trim()
                ? parseInt(data.avatarFileId)
                : null,
          },
          recaptchaToken,
        },
      });

      if (response.register.success) {
        toast.success("Account created successfully! You are now logged in.");
        // Store JWT token in localStorage
        if (response.register.token) {
          saveAuthToken(response.register.token);
        }
        // Refetch user data to update authentication state
        await refetchMe();
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(response.register.message || "An error occurred.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during registration.");
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordForm) => {
    try {
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
          email: data.email,
          username: data.username,
          recaptchaToken,
        },
      });

      toast.success(
        "If an account exists, a password reset link will be sent to the email address."
      );
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    }
  };

  const resetForms = () => {
    // Reset forms using react-hook-form
    loginForm.reset();
    registerForm.reset();
    forgotPasswordForm.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForms();
          // If externally controlled and closing without success, call onCancel
          if (externalOpen !== undefined && onCancel) {
            onCancel();
          }
        }
      }}
    >
      <DialogTrigger asChild>
        {/* {children || (
          <BouncyClick>
            <Button>
              <LogIn className="h-4 w-4 mr-2 TEST" />
              Login/Register
            </Button>
          </BouncyClick>
        )} */}
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Feednana</DialogTitle>
          <DialogDescription>
            Login or Register to vote, keep track of files, create timelines,
            and more.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <BouncyClick>
              <TabsTrigger className="w-full" value="login">
                Login
              </TabsTrigger>
            </BouncyClick>
            <BouncyClick>
              <TabsTrigger className="w-full" value="register">
                Register
              </TabsTrigger>
            </BouncyClick>
            <BouncyClick>
              <TabsTrigger className="w-full" value="forgot">
                Forgot Password
              </TabsTrigger>
            </BouncyClick>
          </TabsList>

          <AnimatePresence mode="wait">
            {activeTab === "login" && (
              <motion.div
                key="login"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                <form
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      {...loginForm.register("username")}
                      disabled={loginForm.formState.isSubmitting}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                      disabled={loginForm.formState.isSubmitting}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <BouncyClick>
                    <Button
                      type="submit"
                      className="w-full text-white"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <Spinner className="mr-2" size="sm" color="white" />
                          Logging in
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </BouncyClick>
                </form>
              </motion.div>
            )}
            {activeTab === "register" && (
              <motion.div
                key="register"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                <form
                  onSubmit={registerForm.handleSubmit(handleRegister)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-username">Username *</Label>
                      <Input
                        id="register-username"
                        {...registerForm.register("username")}
                        disabled={registerForm.formState.isSubmitting}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="register-display-name">
                        Display Name *
                      </Label>
                      <Input
                        id="register-display-name"
                        {...registerForm.register("displayName")}
                        disabled={registerForm.formState.isSubmitting}
                      />
                      {registerForm.formState.errors.displayName && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.displayName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      {...registerForm.register("email")}
                      disabled={registerForm.formState.isSubmitting}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="register-password">Password *</Label>
                      <Input
                        id="register-password"
                        type="password"
                        {...registerForm.register("password")}
                        disabled={registerForm.formState.isSubmitting}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="register-confirm-password">
                        Confirm Password *
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                        disabled={registerForm.formState.isSubmitting}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive mt-1">
                          {
                            registerForm.formState.errors.confirmPassword
                              .message
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-bio">Bio</Label>
                    <Textarea
                      id="register-bio"
                      {...registerForm.register("bio")}
                      disabled={registerForm.formState.isSubmitting}
                      placeholder="Tell us about yourself (optional)"
                      className="min-h-[80px]"
                    />
                    {registerForm.formState.errors.bio && (
                      <p className="text-sm text-destructive mt-1">
                        {registerForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="register-avatar">Avatar (File ID)</Label>
                    <Input
                      id="register-avatar"
                      {...registerForm.register("avatarFileId")}
                      disabled={registerForm.formState.isSubmitting}
                      placeholder="Enter a file ID for your avatar (optional)"
                    />
                    {registerForm.watch("avatarFileId") && !avatarValid && (
                      <p className="text-sm text-destructive mt-1">
                        This is not a valid image file ID
                      </p>
                    )}
                  </div>

                  <BouncyClick>
                    <Button
                      type="submit"
                      className="w-full text-white"
                      disabled={
                        registerForm.formState.isSubmitting ||
                        ((registerForm.watch("avatarFileId")?.trim()?.length ??
                          0) > 0 &&
                          !avatarValid)
                      }
                    >
                      {registerForm.formState.isSubmitting ? (
                        <>
                          <Spinner className="mr-2" size="sm" color="white" />
                          Creating account
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </BouncyClick>
                </form>
              </motion.div>
            )}
            {activeTab === "forgot" && (
              <motion.div
                key="forgot"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                <form
                  onSubmit={forgotPasswordForm.handleSubmit(
                    handleForgotPassword
                  )}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="forgot-username">Username</Label>
                    <Input
                      id="forgot-username"
                      {...forgotPasswordForm.register("username")}
                      disabled={forgotPasswordForm.formState.isSubmitting}
                    />
                    {forgotPasswordForm.formState.errors.username && (
                      <p className="text-sm text-destructive mt-1">
                        {forgotPasswordForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      {...forgotPasswordForm.register("email")}
                      disabled={forgotPasswordForm.formState.isSubmitting}
                    />
                    {forgotPasswordForm.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {forgotPasswordForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <BouncyClick>
                    <Button
                      type="submit"
                      className="w-full text-white"
                      disabled={forgotPasswordForm.formState.isSubmitting}
                    >
                      {forgotPasswordForm.formState.isSubmitting ? (
                        <>
                          <Spinner className="mr-2" size="sm" color="white" />
                          Sending
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </BouncyClick>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center mt-4">
          This site is protected by reCAPTCHA, and the Google{" "}
          <a href="https://policies.google.com/privacy" className="underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="https://policies.google.com/terms" className="underline">
            Terms of Service
          </a>{" "}
          apply.
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuthDialog({
  children,
  defaultTab = "login",
  onSuccess,
  open,
  onOpenChange,
  onCancel,
}: AuthDialogProps) {
  return (
    <AuthDialogContent
      defaultTab={defaultTab}
      onSuccess={onSuccess}
      open={open}
      onOpenChange={onOpenChange}
      onCancel={onCancel}
    >
      {children}
    </AuthDialogContent>
  );
}
