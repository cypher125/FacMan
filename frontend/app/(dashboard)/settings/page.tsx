"use client";

import { useEffect, useState } from "react";
import { User, Shield, Key, Copy, Trash2, Check, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { APIKey } from "@/lib/types";

type Tab = "profile" | "security" | "api-keys";

const ALL_SCOPES = [
  "pages:read",
  "pages:write",
  "posts:read",
  "posts:write",
  "analytics:read",
  "analytics:write",
  "messaging:read",
  "messaging:write",
  "scheduler:read",
  "scheduler:write",
] as const;

const tabs: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "security", label: "Security", icon: Shield },
  { key: "api-keys", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Security state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>([]);
  const [keySubmitting, setKeySubmitting] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Populate profile fields from user
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  // Fetch API keys when tab is active
  useEffect(() => {
    if (activeTab !== "api-keys") return;
    setLoadingKeys(true);
    api
      .get("/auth/api-keys/")
      .then((res) => {
        const list = res.data.results || res.data;
        setApiKeys(Array.isArray(list) ? list : []);
      })
      .catch(() => setApiKeys([]))
      .finally(() => setLoadingKeys(false));
  }, [activeTab]);

  // Profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSubmitting(true);
    try {
      await api.patch("/auth/me/", { username, email });
      await refreshUser();
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      const data = error.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(" ");
        setProfileError(msg || "Failed to update profile.");
      } else {
        setProfileError("Failed to update profile.");
      }
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError("");
    setSecuritySuccess("");

    if (newPassword.length < 8) {
      setSecurityError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match.");
      return;
    }

    setSecuritySubmitting(true);
    try {
      await api.post("/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setSecuritySuccess("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      const data = error.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(" ");
        setSecurityError(msg || "Failed to change password.");
      } else {
        setSecurityError("Failed to change password.");
      }
    } finally {
      setSecuritySubmitting(false);
    }
  };

  // Create API key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    setCreatedKey(null);
    if (!keyName.trim()) {
      setKeyError("Name is required.");
      return;
    }
    if (keyScopes.length === 0) {
      setKeyError("Select at least one scope.");
      return;
    }
    setKeySubmitting(true);
    try {
      const res = await api.post("/auth/api-keys/", {
        name: keyName,
        scopes: keyScopes,
      });
      setCreatedKey(res.data.key);
      setKeyName("");
      setKeyScopes([]);
      setShowKeyForm(false);
      // Refresh list
      const listRes = await api.get("/auth/api-keys/");
      const list = listRes.data.results || listRes.data;
      setApiKeys(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      const data = error.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(" ");
        setKeyError(msg || "Failed to create API key.");
      } else {
        setKeyError("Failed to create API key.");
      }
    } finally {
      setKeySubmitting(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    setRevokingId(id);
    try {
      await api.delete(`/auth/api-keys/${id}/`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // silently fail
    } finally {
      setRevokingId(null);
    }
  };

  // Toggle scope
  const toggleScope = (scope: string) => {
    setKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  // Copy key to clipboard
  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Facebook connect
  const handleFacebookConnect = async () => {
    try {
      const res = await api.get("/auth/facebook/login/");
      const url = res.data.authorization_url;
      if (url) window.location.href = url;
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your profile, security, and API keys
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-card-border bg-card-bg p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <p className="text-sm text-text-secondary">Update your account details</p>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-5 p-6">
            {profileError && (
              <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-xl bg-success-light p-3 text-sm text-success">
                {profileSuccess}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Facebook connection */}
            <div className="rounded-xl border border-card-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Facebook Account</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {user?.facebook_user_id
                      ? `Connected (ID: ${user.facebook_user_id})`
                      : "Not connected"}
                  </p>
                </div>
                {!user?.facebook_user_id && (
                  <button
                    type="button"
                    onClick={handleFacebookConnect}
                    className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]"
                  >
                    <ExternalLink size={14} />
                    Connect Facebook
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileSubmitting}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {profileSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-text-secondary">
              Update your password to keep your account secure
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-5 p-6">
            {securityError && (
              <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
                {securityError}
              </div>
            )}
            {securitySuccess && (
              <div className="rounded-xl bg-success-light p-3 text-sm text-success">
                {securitySuccess}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-text-secondary">Minimum 8 characters</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={securitySubmitting}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {securitySubmitting ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api-keys" && (
        <div className="space-y-6">
          {/* Created key alert */}
          {createdKey && (
            <div className="rounded-xl border border-success bg-success-light p-4">
              <p className="mb-2 text-sm font-medium text-success">
                API key created! Copy it now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-surface p-2.5 font-mono text-xs break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyKey(createdKey)}
                  className="rounded-lg bg-surface p-2 text-muted transition-colors hover:text-foreground"
                >
                  {copiedKey ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">API Keys</h2>
                <p className="text-sm text-text-secondary">
                  Manage keys for programmatic API access
                </p>
              </div>
              <button
                onClick={() => {
                  setShowKeyForm(!showKeyForm);
                  setKeyError("");
                }}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                <Key size={14} />
                Create Key
              </button>
            </div>

            {/* Create key form */}
            {showKeyForm && (
              <form onSubmit={handleCreateKey} className="border-b border-card-border p-6">
                <div className="space-y-4">
                  {keyError && (
                    <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
                      {keyError}
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Key Name</label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Production App"
                      className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Scopes</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SCOPES.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            keyScopes.includes(scope)
                              ? "bg-primary text-white"
                              : "bg-surface-hover text-muted hover:text-foreground"
                          }`}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowKeyForm(false);
                        setKeyError("");
                      }}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={keySubmitting}
                      className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                    >
                      {keySubmitting ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Keys list */}
            <div className="divide-y divide-card-border">
              {loadingKeys ? (
                <div className="p-6">
                  <div className="h-16 animate-pulse rounded-xl bg-surface-hover" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">
                  No API keys yet. Create one to get started.
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{key.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            key.is_active
                              ? "bg-success-light text-success"
                              : "bg-surface-hover text-muted"
                          }`}
                        >
                          {key.is_active ? "Active" : "Revoked"}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">
                        ****{key.prefix}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at &&
                          ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {key.is_active && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={revokingId === key.id}
                        className="ml-4 rounded-lg p-2 text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
                        title="Revoke key"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
