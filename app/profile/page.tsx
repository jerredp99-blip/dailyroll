"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import {
  Check,
  Camera,
  Trash2,
  MessageSquare,
  Settings,
  Sparkles,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { apiGetProfile, apiSaveProfile, apiGetUsers } from "@/lib/api-client";
import { PostCard } from "@/app/components/feed/PostCard";
import type { Post } from "@/lib/store";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PushNotificationModal } from "@/components/PushNotificationModal";
import { getNotificationPermission } from "@/lib/push-notifications";

const PREFERENCES_KEY = "dailyroll_profile_prefs";

type SortOrder = "next-available" | "f2p" | "trustpilot";

type StoredPreferences = {
  name: string;
  email: string;
  avatarUrl?: string;
  notifications: boolean;
  amoe: boolean;
  sortOrder: SortOrder;
};

const DEFAULT_PREFERENCES: StoredPreferences = {
  name: "PlayerOne",
  email: "player@example.com",
  notifications: false,
  amoe: true,
  sortOrder: "next-available",
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"settings" | "posts">("settings");
  const [name, setName] = useState(DEFAULT_PREFERENCES.name);
  const [email, setEmail] = useState(DEFAULT_PREFERENCES.email);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [amoeEnabled, setAmoeEnabled] = useState(DEFAULT_PREFERENCES.amoe);
  const [notifications, setNotifications] = useState(DEFAULT_PREFERENCES.notifications);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_PREFERENCES.sortOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // User posts state
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Admin active users state
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);

  // Push notifications state & hook
  const {
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    isIosNeedsInstall,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = usePushNotifications();

  const [pushModal, setPushModal] = useState<{
    isOpen: boolean;
    type: "denied" | "ios_install" | "general_error" | "info";
    message?: string;
  }>({ isOpen: false, type: "info" });
  const [testSent, setTestSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin session and fetch total active users count
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.isAdmin) {
          setIsAdmin(true);
          try {
            const users = await apiGetUsers();
            if (cancelled) return;
            const now = Date.now();
            const active = users.filter((u: any) => {
              if (!u.lastActiveAt) return false;
              const t = new Date(u.lastActiveAt).getTime();
              return !isNaN(t) && now - t < 5 * 60 * 1000;
            }).length;
            setActiveUsersCount(Math.max(1, active));
          } catch (err) {
            console.error("Failed to load active users count:", err);
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load preferences: local storage first (instant), then the account when signed in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = window.localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<StoredPreferences>;
          if (cancelled) return;
          if (typeof parsed.name === "string") setName(parsed.name);
          if (typeof parsed.email === "string") setEmail(parsed.email);
          if (typeof parsed.avatarUrl === "string") setAvatarUrl(parsed.avatarUrl);
          if (typeof parsed.notifications === "boolean") setNotifications(parsed.notifications);
          if (typeof parsed.amoe === "boolean") setAmoeEnabled(parsed.amoe);
          if (parsed.sortOrder) {
            setSortOrder(
              parsed.sortOrder === ("status" as any) || parsed.sortOrder === "f2p"
                ? "next-available"
                : parsed.sortOrder,
            );
          }
        } catch {
          // Ignore malformed local preferences.
        }
      }

      try {
        const data = await apiGetProfile();
        if (cancelled) return;
        if (data.user) {
          setName(data.user.name);
          setEmail(data.user.email);
          if (data.user.avatarUrl) setAvatarUrl(data.user.avatarUrl);
        }
        if (data.preferences) {
          setNotifications(data.preferences.notifications);
          setAmoeEnabled(data.preferences.amoe);
          const savedOrder = data.preferences.sortOrder;
          const isMigrated = typeof window !== "undefined" && window.localStorage.getItem("dailyroll_sort_migrated_v2");
          setSortOrder(
            !isMigrated && savedOrder === "f2p"
              ? "next-available"
              : savedOrder === "trustpilot" || savedOrder === "f2p"
              ? savedOrder
              : "next-available",
          );
          if (data.preferences.contactEmail) setEmail(data.preferences.contactEmail);
          if (data.preferences.avatarUrl) setAvatarUrl(data.preferences.avatarUrl);
        }
      } catch {
        // Offline or signed out — keep whatever was stored locally.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch authored posts for this user
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    setLoadingPosts(true);

    (async () => {
      try {
        const res = await fetch(`/api/posts?authorEmail=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.posts) {
          setMyPosts(data.posts);
        }
      } catch (err) {
        console.error("Failed to fetch user posts", err);
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [email]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      setStatus("Photo updated. Click 'Save Changes' to apply.");
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setStatus("Avatar removed. Click 'Save Changes' to apply.");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setError("");
    setSavedLocally(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Always persist on this device so the values survive a refresh even when offline.
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        avatarUrl,
        notifications,
        amoe: amoeEnabled,
        sortOrder,
      } satisfies StoredPreferences),
    );
    window.localStorage.setItem("dailyroll_casino_sort", sortOrder);
    window.localStorage.setItem("dailyroll_sort_migrated_v2", "true");

    try {
      await apiSaveProfile({
        name: trimmedName,
        contactEmail: trimmedEmail,
        avatarUrl: avatarUrl || undefined,
        notifications,
        amoe: amoeEnabled,
        sortOrder,
      });
      setStatus("Profile and preferences saved successfully!");
    } catch (saveError) {
      setSavedLocally(true);
      setStatus("Saved on this device.");
      setError(saveError instanceof Error ? saveError.message : "Unable to reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  const handlePostUpdated = (updated: Post) => {
    setMyPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (deletedId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const initials = name.trim().slice(0, 2).toUpperCase() || "P1";

  return (
    <main className="min-h-screen bg-[#0a120d] p-4 font-sans text-gray-300 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile Header */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#203728] bg-[#111e16]/95 p-6 backdrop-blur">
          {isAdmin && activeUsersCount !== null && (
            <div
              className="absolute top-2.5 right-3 sm:top-3.5 sm:right-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/90 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-300 shadow-md backdrop-blur"
              title="Total active users online in last 5m"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{activeUsersCount} Active {activeUsersCount === 1 ? "User" : "Users"}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-800 to-teal-900 text-2xl font-bold text-white shadow-md">
                  {initials}
                </div>
              )}

              {/* Quick photo change button overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-500"
                title="Upload profile picture"
              >
                <Camera size={14} />
              </button>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">{name}</h1>
              <p className="text-xs text-[#8ca592]">{email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {myPosts.length} {myPosts.length === 1 ? "Post" : "Posts"}
                </span>
                <span className="rounded-md bg-[#192b20] px-2 py-0.5 text-[11px] text-[#93ab98]">
                  Roller Member
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/tracker"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/60"
          >
            <span>Go to Rollcall</span>
            <ExternalLink size={13} />
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1f3527] gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "settings"
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-[#8ca592] hover:text-white"
            }`}
          >
            <Settings size={14} />
            <span>Profile & Tracker Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "posts"
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-[#8ca592] hover:text-white"
            }`}
          >
            <MessageSquare size={14} />
            <span>My Posts ({myPosts.length})</span>
          </button>
        </div>

        {/* Tab 1: Profile & Settings Form */}
        {activeTab === "settings" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Card */}
            <div className="rounded-2xl border border-[#203728] bg-[#111e16] p-6 shadow-sm">
              <h2 className="mb-2 text-base font-bold text-white flex items-center gap-2">
                <Camera size={16} className="text-emerald-400" />
                Profile Picture
              </h2>
              <p className="text-xs text-[#8ca592] mb-4">
                Upload a personalized avatar to represent you across community posts and comments.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 shadow"
                >
                  <Camera size={14} />
                  <span>Choose Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-900/40"
                  >
                    <Trash2 size={13} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Account Details Card */}
            <div className="rounded-2xl border border-[#203728] bg-[#111e16] p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-white">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-username" className="mb-1.5 block text-xs font-semibold text-[#8ca592]">
                    Username / Display Name
                  </label>
                  <input
                    id="profile-username"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[#243d2e] bg-[#0d1611] px-4 py-2.5 text-xs text-white placeholder-[#5c7261] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold text-[#8ca592]">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#243d2e] bg-[#0d1611] px-4 py-2.5 text-xs text-white placeholder-[#5c7261] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Tracker Settings Card */}
            <div className="rounded-2xl border border-[#203728] bg-[#111e16] p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-white">Tracker Preferences</h2>

              <div className="space-y-5">
                {/* Notifications Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Daily Login Reminders</span>
                        {isPushSubscribed && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
                            Push Active
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-[#8ca592]">Get notified when cooldowns reach zero</p>
                    </div>
                    <button
                      type="button"
                      disabled={isPushLoading}
                      aria-pressed={Boolean(notifications && isPushSubscribed)}
                      aria-label="Toggle daily login reminders"
                      className={`relative h-6 w-12 rounded-full border transition-colors cursor-pointer ${
                        notifications && isPushSubscribed
                          ? "border-emerald-500 bg-emerald-500/20"
                          : "border-gray-700 bg-gray-800"
                      }`}
                      onClick={async () => {
                        const isCurrentlyActive = Boolean(notifications && isPushSubscribed);
                        if (!isCurrentlyActive) {
                          if (pushPermission === "denied") {
                            setPushModal({ isOpen: true, type: "denied" });
                            return;
                          }
                          if (isIosNeedsInstall) {
                            setPushModal({ isOpen: true, type: "ios_install" });
                            return;
                          }
                          const ok = await subscribePush();
                          if (ok) {
                            setNotifications(true);
                          } else {
                            const latestPerm = getNotificationPermission();
                            if (latestPerm === "denied") {
                              setPushModal({ isOpen: true, type: "denied" });
                            }
                          }
                        } else {
                          await unsubscribePush();
                          setNotifications(false);
                        }
                      }}
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                          notifications && isPushSubscribed
                            ? "right-1 bg-emerald-500"
                            : "left-1 bg-gray-500"
                        }`}
                      />
                    </button>
                  </div>

                  {pushPermission === "denied" && (
                    <div
                      onClick={() => setPushModal({ isOpen: true, type: "denied" })}
                      className="cursor-pointer rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300 flex items-center justify-between transition hover:bg-rose-500/20"
                    >
                      <span>⚠️ Notifications blocked in browser settings. Tap to view fix instructions.</span>
                      <span className="underline text-rose-400 text-[10px]">Instructions</span>
                    </div>
                  )}

                  {isIosNeedsInstall && (
                    <div
                      onClick={() => setPushModal({ isOpen: true, type: "ios_install" })}
                      className="cursor-pointer rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300 flex items-center justify-between transition hover:bg-amber-500/20"
                    >
                      <span>📲 iOS requires Home Screen install to receive push alerts.</span>
                      <span className="underline text-amber-400 text-[10px]">Setup Guide</span>
                    </div>
                  )}

                  {isPushSubscribed && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-500">Service Worker push listener active</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await sendTestNotification();
                          if (ok) {
                            setTestSent(true);
                            setTimeout(() => setTestSent(false), 4000);
                          }
                        }}
                        className="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 transition cursor-pointer"
                      >
                        {testSent ? "Test Alert Sent! ✓" : "Send Test Notification"}
                      </button>
                    </div>
                  )}
                </div>

                {/* AMOE Settings */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">AMOE / Mail-In Entry Tracking</h3>
                    <p className="text-[11px] text-[#8ca592]">
                      Enable envelope logs for Stake, Zula, Crown, etc.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={amoeEnabled}
                    aria-label="Toggle AMOE tracking"
                    className={`relative h-6 w-12 rounded-full border transition-colors ${
                      amoeEnabled
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-gray-700 bg-gray-800"
                    }`}
                    onClick={() => setAmoeEnabled(!amoeEnabled)}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                        amoeEnabled ? "right-1 bg-emerald-500" : "left-1 bg-gray-500"
                      }`}
                    />
                  </button>
                </div>

                {/* Default Sort */}
                <div className="pt-2">
                  <label htmlFor="profile-sort" className="mb-1.5 block text-xs font-semibold text-[#8ca592]">
                    Default Sort Order
                  </label>
                  <select
                    id="profile-sort"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full appearance-none rounded-xl border border-[#243d2e] bg-[#0d1611] px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="next-available">Next Available (Ready first)</option>
                    <option value="trustpilot">Highest Trustpilot rating</option>
                    <option value="f2p">Best F2P / Free to play</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {status && (
                  <p role="status" className="text-xs text-emerald-400 font-semibold">
                    {status}
                  </p>
                )}
                {error && !savedLocally && (
                  <p role="alert" className="text-xs text-red-400">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isSaving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: My Posts Section */}
        {activeTab === "posts" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between rounded-xl border border-[#203728] bg-[#111e16] px-4 py-3 text-xs">
              <span className="font-semibold text-[#8ca592]">
                Your Authored Posts ({myPosts.length})
              </span>
              <Link
                href="/tracker"
                className="font-bold text-emerald-400 hover:text-emerald-300"
              >
                + Create New Post in Feed
              </Link>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col items-center justify-center py-16 text-emerald-400 space-y-3">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-xs text-[#7d9985]">Loading your posts...</p>
              </div>
            ) : myPosts.length === 0 ? (
              <div className="rounded-2xl border border-[#203728] bg-[#111e16] p-8 text-center text-xs text-[#7d9985]">
                <p className="text-sm font-semibold text-white mb-1">You haven't posted yet</p>
                <p className="mb-4">Share your big wins, drop codes, or strategies with the community!</p>
                <Link
                  href="/tracker"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  Go to Feed
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {myPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserEmail={email}
                    onPostUpdated={handlePostUpdated}
                    onPostDeleted={handlePostDeleted}
                    isMenuOpen={openMenuPostId === post.id}
                    onToggleMenu={(open) => setOpenMenuPostId(open ? post.id : null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PushNotificationModal
        isOpen={pushModal.isOpen}
        onClose={() => setPushModal((prev) => ({ ...prev, isOpen: false }))}
        type={pushModal.type}
        customMessage={pushModal.message}
        onRetry={async () => {
          setPushModal((prev) => ({ ...prev, isOpen: false }));
          const ok = await subscribePush();
          if (ok) setNotifications(true);
        }}
      />
    </main>
  );
}

