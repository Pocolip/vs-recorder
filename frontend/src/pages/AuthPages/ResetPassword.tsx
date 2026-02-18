import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import authApi from "../../services/api/authApi";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="VS Recorder | Reset Password"
        description="Set a new password for your VS Recorder account"
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}

type State = "validating" | "invalid" | "form" | "success";

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>(token ? "validating" : "invalid");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordTooShort = password.length > 0 && password.length < 6;

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    authApi
      .validateResetToken(token)
      .then((res) => {
        setState(res.valid ? "form" : "invalid");
      })
      .catch(() => {
        setState("invalid");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !passwordsMatch || passwordTooShort) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.resetPassword({ token, newPassword: password });
      setState("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Reset Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your new password below.
            </p>
          </div>
          <div>
            {state === "validating" && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            )}

            {state === "invalid" && (
              <div className="space-y-6">
                <Alert
                  variant="error"
                  title="Invalid or expired link"
                  message="This password reset link is invalid or has expired. Please request a new one."
                />
                <Link
                  to="/forgot-password"
                  className="inline-block text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Request new reset link
                </Link>
              </div>
            )}

            {state === "success" && (
              <div className="space-y-6">
                <Alert
                  variant="success"
                  title="Password reset successful"
                  message="Your password has been updated. You can now sign in with your new password."
                />
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Go to Sign In
                </Link>
              </div>
            )}

            {state === "form" && (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <Label>
                        New Password <span className="text-error-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <span
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showPassword ? (
                            <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          ) : (
                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          )}
                        </span>
                      </div>
                      {passwordTooShort && (
                        <p className="mt-1.5 text-xs text-error-500">
                          Password must be at least 6 characters
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>
                        Confirm Password <span className="text-error-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <span
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showConfirm ? (
                            <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          ) : (
                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                          )}
                        </span>
                      </div>
                      {confirmPassword.length > 0 && (
                        <p
                          className={`mt-1.5 flex items-center gap-1 text-xs ${
                            passwordsMatch
                              ? "text-success-500"
                              : "text-error-500"
                          }`}
                        >
                          {passwordsMatch ? (
                            <>
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Passwords match
                            </>
                          ) : (
                            "Passwords do not match"
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={isSubmitting || !passwordsMatch || passwordTooShort}
                      >
                        {isSubmitting ? "Resetting..." : "Reset Password"}
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
