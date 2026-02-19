"use client";

import { useEffect, useState } from "react";
import { User, Shield, Key, Copy, Trash2, Check, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { APIKey } from "@/lib/types";

type Tab = "profile" | "security" | "api-keys";

const ALL_SCOPES = [
  "pages:read", "pages:write", "posts:read", "posts:write",
  "analytics:read", "analytics:write", "messaging:read", "messaging:write",
  "scheduler:read", "scheduler:write",
] as const;

const tabs: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "security", label: "Security", icon: Shield },
  { key: "api-keys", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");

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

  useEffect(() => { if (user) { setUsername(user.username); setEmail(user.email); } }, [user]);

  useEffect(() => {
    if (activeTab !== "api-keys") return;
    setLoadingKeys(true);
    api.get("/auth/api-keys/")
      .then((res) => { const list = res.data.results || res.data; setApiKeys(Array.isArray(list) ? list : []); })
      .catch(() => setApiKeys([]))
      .finally(() => setLoadingKeys(false));
  }, [activeTab]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(""); setProfileSuccess(""); setProfileSubmitting(true);
    try {
      await api.patch("/auth/me/", { username, email });
      await refreshUser();
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
      setProfileError(data ? Object.values(data).flat().join(" ") || "Failed to update profile." : "Failed to update profile.");
    } finally { setProfileSubmitting(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(""); setSecuritySuccess("");
    if (newPassword.length < 8) { setSecurityError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setSecurityError("New passwords do not match."); return; }
    setSecuritySubmitting(true);
    try {
      await api.post("/auth/change-password/", { old_password: oldPassword, new_password: newPassword, new_password_confirm: confirmPassword });
      setSecuritySuccess("Password changed successfully.");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
      setSecurityError(data ? Object.values(data).flat().join(" ") || "Failed to change password." : "Failed to change password.");
    } finally { setSecuritySubmitting(false); }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(""); setCreatedKey(null);
    if (!keyName.trim()) { setKeyError("Name is required."); return; }
    if (keyScopes.length === 0) { setKeyError("Select at least one scope."); return; }
    setKeySubmitting(true);
    try {
      const res = await api.post("/auth/api-keys/", { name: keyName, scopes: keyScopes });
      setCreatedKey(res.data.key);
      setKeyName(""); setKeyScopes([]); setShowKeyForm(false);
      const listRes = await api.get("/auth/api-keys/");
      const list = listRes.data.results || listRes.data;
      setApiKeys(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
      setKeyError(data ? Object.values(data).flat().join(" ") || "Failed to create API key." : "Failed to create API key.");
    } finally { setKeySubmitting(false); }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    setRevokingId(id);
    try { await api.delete(`/auth/api-keys/${id}/`); setApiKeys((prev) => prev.filter((k) => k.id !== id)); }
    catch { /* silent */ }
    finally { setRevokingId(null); }
  };

  const toggleScope = (scope: string) =>
    setKeyScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleFacebookConnect = async () => {
    try { const res = await api.get("/auth/facebook/login/"); if (res.data.authorization_url) window.location.href = res.data.authorization_url; }
    catch { /* silent */ }
  };

  const inputCls = "w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your profile, security, and API keys</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-card-border bg-card-bg p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <tab.icon size={15} />{tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="border-b border-border-light bg-surface-hover px-6 py-4">
            <h2 className="text-sm font-semibold">Profile Information</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Update your account details</p>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-5 p-6">
            {profileError && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{profileError}</div>}
            {profileSuccess && <div className="rounded-xl bg-success-light p-3 text-sm text-success">{profileSuccess}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div className="rounded-xl border border-card-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Facebook Account</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {user?.facebook_user_id ? `Connected (ID: ${user.facebook_user_id})` : "Not connected"}
                  </p>
                </div>
                {!user?.facebook_user_id && (
                  <button type="button" onClick={handleFacebookConnect}
                    className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1565C0]"
                  >
                    <ExternalLink size={13} />Connect Facebook
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={profileSubmitting}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {profileSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="border-b border-border-light bg-surface-hover px-6 py-4">
            <h2 className="text-sm font-semibold">Change Password</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Update your password to keep your account secure</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-5 p-6">
            {securityError && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{securityError}</div>}
            {securitySuccess && <div className="rounded-xl bg-success-light p-3 text-sm text-success">{securitySuccess}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Password</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputCls} />
              <p className="mt-1 text-xs text-text-secondary">Minimum 8 characters</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className={inputCls} />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={securitySubmitting}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {securitySubmitting ? "Changing…" : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api-keys" && (
        <div className="space-y-4">
          {createdKey && (
            <div className="rounded-xl border border-success bg-success-light p-4">
              <p className="mb-2 text-sm font-medium text-success">API key created! Copy it now — it won&apos;t be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-surface p-2.5 font-mono text-xs">{createdKey}</code>
                <button onClick={() => copyKey(createdKey)} className="rounded-lg bg-surface p-2 text-muted hover:text-foreground">
                  {copiedKey ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">API Keys</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Manage keys for programmatic API access</p>
              </div>
              <button onClick={() => { setShowKeyForm(!showKeyForm); setKeyError(""); }}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Key size={13} />Create Key
              </button>
            </div>

            {showKeyForm && (
              <form onSubmit={handleCreateKey} className="border-b border-border-light p-5 space-y-4">
                {keyError && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{keyError}</div>}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Key Name</label>
                  <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Production App"
                    className="w-full rounded-xl border border-card-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Scopes</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SCOPES.map((scope) => (
                      <button key={scope} type="button" onClick={() => toggleScope(scope)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          keyScopes.includes(scope) ? "bg-primary text-white" : "bg-surface-hover text-muted hover:text-foreground"
                        }`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowKeyForm(false); setKeyError(""); }}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
                  >Cancel</button>
                  <button type="submit" disabled={keySubmitting}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {keySubmitting ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light">
              {loadingKeys ? (
                <div className="p-5">
                  <div className="h-16 animate-pulse rounded-xl bg-surface-hover" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">No API keys yet. Create one to get started.</div>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-hover">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{key.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          key.is_active ? "bg-success-light text-success" : "bg-surface-hover text-muted"
                        }`}>
                          {key.is_active ? "Active" : "Revoked"}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary">****{key.prefix}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span key={scope} className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted">{scope}</span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {key.is_active && (
                      <button onClick={() => handleRevokeKey(key.id)} disabled={revokingId === key.id}
                        className="ml-4 rounded-lg p-2 text-muted hover:bg-danger-light hover:text-danger disabled:opacity-50"
                        title="Revoke key"
                      >
                        <Trash2 size={15} />
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
