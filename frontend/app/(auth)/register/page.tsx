"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { ApiError } from "@/lib/types";
import { AxiosError } from "axios";
import { UserPlus, Zap } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(username, email, password, passwordConfirm);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const data = axiosErr.response?.data;
      if (data) {
        const messages = Object.entries(data)
          .filter(([key]) => key !== "detail")
          .map(([, val]) => (Array.isArray(val) ? val.join(" ") : String(val)));
        setError(
          data.detail || messages.join(" ") || "Registration failed."
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary">
          <Zap size={18} className="text-white" />
        </div>
        <span className="text-xl font-bold">FacMan</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Get started managing your Facebook pages
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-danger-light p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-[13px] font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="johndoe"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="passwordConfirm" className="mb-1.5 block text-[13px] font-medium">
            Confirm password
          </label>
          <input
            id="passwordConfirm"
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          <UserPlus size={16} />
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
