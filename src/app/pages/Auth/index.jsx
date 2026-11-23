// Import Dependencies
import { Link } from "react-router";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import { JWT_HOST_API } from "configs/auth.config";

// Local Imports
import { Card, Checkbox, Input, InputErrorMsg, ReactSelect } from "components/ui";
import { schema } from "./schema";
import { Page } from "components/shared/Page";
import appLogo from "assets/logo.png";
import { useAuthContext } from "app/contexts/auth/context";
import { getFinancialYears } from "utils/financialYear";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthContext();
  const finYears = getFinancialYears();

  // ── Forgot Password Modal State ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = identifier, 2 = otp + new pwd, 3 = success
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // ── Brute Force Mitigation State ──
  const [failedAttempts, setFailedAttempts] = useState(() =>
    Number(localStorage.getItem("login_failed_attempts") || 0),
  );
  const [lockoutTime, setLockoutTime] = useState(() =>
    Number(localStorage.getItem("login_lockout_until") || 0),
  );
  const [timeLeft, setTimeLeft] = useState(0);

  // Update cooldown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (lockoutTime > now) {
        setTimeLeft(Math.ceil((lockoutTime - now) / 1000));
      } else {
        if (timeLeft > 0) setTimeLeft(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime, timeLeft]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      fiscalYear: finYears[0], // Default to current FY
    },
  });

  const onSubmit = async (data) => {
    if (timeLeft > 0) return;

    try {
      await login({
        username: data.username,
        password: data.password,
        finyear: data.fiscalYear,
      });

      // Reset on Success
      setFailedAttempts(0);
      setLockoutTime(0);
      localStorage.removeItem("login_failed_attempts");
      localStorage.removeItem("login_lockout_until");

      const searchParams = new URLSearchParams(location.search);
      const redirect = searchParams.get("redirect");
      const finalRedirect =
        redirect && redirect !== "null" && redirect !== "undefined"
          ? redirect
          : "/dashboards/home";
      navigate(finalRedirect, { replace: true });
    } catch (err) {
      // Increment failed attempts
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem("login_failed_attempts", newAttempts);

      // Determine Lockout/Throttle time
      let waitDuration = 0;
      if (newAttempts >= 5)
        waitDuration = 30000; // 30s lockout
      else if (newAttempts === 4)
        waitDuration = 5000; // 5s throttle
      else if (newAttempts === 3) waitDuration = 2000; // 2s throttle

      if (waitDuration > 0) {
        const until = Date.now() + waitDuration;
        setLockoutTime(until);
        localStorage.setItem("login_lockout_until", until);
      }

      setErrorMessage(
        err?.error ||
        err?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err === 'string' ? err : "Login failed. Please try again.")
      );
    }
  };

  const handleOpenForgotModal = (e) => {
    e.preventDefault();
    setForgotStep(1);
    setForgotIdentifier("");
    setForgotOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
    setShowForgotModal(true);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your username or registered email.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await axios.post(`${JWT_HOST_API}/auth/forgot-password/send-otp`, {
        identifier: forgotIdentifier.trim(),
      });
      if (res.data?.status) {
        setMaskedEmail(res.data.masked_email || "your registered email");
        setForgotStep(2);
        setForgotSuccess(res.data.message || "OTP sent successfully.");
      } else {
        setForgotError(res.data?.message || "Failed to send verification code.");
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
        err.message ||
        "Unable to send verification code. Please check username/email."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the complete 6-digit OTP code.");
      return;
    }
    if (!newPassword || newPassword.length < 5) {
      setForgotError("New password must be at least 5 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("New password and confirm password do not match.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await axios.post(`${JWT_HOST_API}/auth/forgot-password/verify-otp-reset`, {
        identifier: forgotIdentifier.trim(),
        otp: forgotOtp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.data?.status) {
        setForgotStep(3);
        setForgotSuccess(res.data.message || "Password reset successfully!");
        if (res.data.username) {
          setValue("username", res.data.username);
        }
      } else {
        setForgotError(res.data?.message || "Failed to reset password.");
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
        err.message ||
        "Verification failed. Please check the OTP and try again."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const isLocked = timeLeft > 0;

  return (
    <Page title="Login">
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <div className="mt-4">
              <Link to="/">
                <img
                  src={appLogo}
                  alt="App Logo"
                  className="h-10 w-auto object-contain text-center"
                  style={{ marginLeft: "70px" }}
                />
              </Link>
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-600">
                Welcome Back
              </h2>
              <p className="dark:text-dark-300 text-gray-400">
                Please sign in to continue
              </p>
            </div>
          </div>
          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
              <div className="space-y-4">
                <Input
                  label="Username"
                  placeholder="Enter Username"
                  prefix={<EnvelopeIcon className="size-5" strokeWidth="1" />}
                  {...register("username")}
                  error={errors?.username?.message}
                  disabled={isLocked}
                />
                <Input
                  label="Password"
                  placeholder="Enter Password"
                  type={showPassword ? "text" : "password"}
                  prefix={<LockClosedIcon className="size-5" strokeWidth="1" />}
                  suffix={
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="size-5" strokeWidth="1" />
                      ) : (
                        <EyeIcon className="size-5" strokeWidth="1" />
                      )}
                    </button>
                  }
                  {...register("password")}
                  error={errors?.password?.message}
                  disabled={isLocked}
                />
              </div>

              <div className="mt-2">
                {isLocked ? (
                  <div className="rounded bg-red-50 p-2 text-center text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    Too many failed attempts. Please wait {timeLeft}s
                  </div>
                ) : (
                  <InputErrorMsg when={errorMessage}>
                    {errorMessage}
                  </InputErrorMsg>
                )}
              </div>

              <div className="mt-4">
                <Controller
                  name="fiscalYear"
                  control={control}
                  render={({ field }) => (
                    <ReactSelect
                      label="Select Financial Year"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      isDisabled={isLocked}
                      options={finYears.map((fy) => ({ label: `FY ${fy}`, value: fy }))}
                      isClearable={false}
                    />
                  )}
                />
              </div>

              <div className="mt-4 flex items-center justify-between space-x-2">
                <Checkbox label="Remember me" disabled={isLocked} />
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="dark:text-dark-300 dark:hover:text-dark-100 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="mt-5 w-full bg-primary-600 hover:bg-primary-700 rounded-md px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLocked}
              >
                {isLocked ? `Locked (${timeLeft}s)` : "Sign In"}
              </button>
            </form>
          </Card>
        </div>
      </main>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-700 dark:text-dark-100 border border-gray-100 dark:border-dark-600">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-dark-200 transition-colors"
            >
              <XMarkIcon className="size-5" />
            </button>

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600">
                    <KeyIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                      Reset Password
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      Verify your identity via registered email OTP
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-dark-300 mb-4 leading-relaxed">
                  Enter your username or registered email address. We will send a secure 6-digit verification code to your registered email on file.
                </p>

                {forgotError && (
                  <div className="mb-4 rounded-md bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Username or Email
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. pratik or user@kailtech.in"
                        className="w-full rounded-md border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-3 py-2 text-sm text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="rounded-md border border-gray-300 dark:border-dark-500 px-4 py-2 text-xs font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
                      disabled={forgotLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="inline-flex items-center rounded-md bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <ArrowPathIcon className="mr-1.5 size-4 animate-spin" />
                          Sending OTP...
                        </>
                      ) : (
                        "Send Verification Code"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Enter OTP & New Password */}
            {forgotStep === 2 && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                      Enter Verification Code
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      Sent to: <span className="font-semibold text-gray-700 dark:text-dark-200">{maskedEmail}</span>
                    </p>
                  </div>
                </div>

                {forgotSuccess && (
                  <div className="mb-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {forgotSuccess}
                  </div>
                )}

                {forgotError && (
                  <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleVerifyAndReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold rounded-md border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 py-2 text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                      disabled={forgotLoading}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Code expires in 10 minutes. Check spam folder if not received.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 5 characters"
                        className="w-full rounded-md border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-3 py-2 pr-9 text-sm text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        disabled={forgotLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showNewPassword ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-dark-200 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-md border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-3 py-2 pr-9 text-sm text-gray-900 dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        disabled={forgotLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError("");
                        setForgotSuccess("");
                      }}
                      className="text-xs text-gray-500 hover:text-primary-600 underline transition-colors"
                      disabled={forgotLoading}
                    >
                      ← Change user / Resend OTP
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors disabled:opacity-60"
                      >
                        {forgotLoading ? (
                          <>
                            <ArrowPathIcon className="mr-1.5 size-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Reset Password"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Success State */}
            {forgotStep === 3 && (
              <div className="text-center py-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <CheckCircleIcon className="size-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100 mb-1">
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-gray-500 dark:text-dark-300 mb-5">
                  Your new password is now active. You can sign in to your Kailtech LIMS account.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full rounded-md bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
