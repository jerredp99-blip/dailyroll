import { cookies } from "next/headers";
import { Resend } from "resend";
import {
  cleanupExpiredMagicLinks,
  createMagicLink,
  createSession,
  deleteSession,
  getMagicLink,
  getSession,
  getUsers,
  markMagicLinkUsed,
  saveUsers,
  seedAdminUserIfMissing,
  type Session,
  type UserProfile,
} from "@/lib/store";

export const ADMIN_EMAILS = [
  "adminjerredp99@gmail.com",
];
export const ADMIN_EMAIL = "AdminJerredp99@gmail.com";
export const SESSION_COOKIE = "dailyroll_session";
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
}

export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return session;
}

export async function createSessionForEmail(email: string): Promise<Session> {
  const normalized = email.trim().toLowerCase();
  const session: Session = {
    token: generateToken(),
    email: normalized,
    role: isAdminEmail(normalized) ? "admin" : "user",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  await createSession(session);
  return session;
}

export async function setSessionCookie(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createPasswordUser(email: string, name: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (isAdminEmail(normalized)) {
    throw new Error("The admin account is managed separately.");
  }

  const users = await getUsers();
  const existing = users.find((user) => user.email.toLowerCase() === normalized);

  if (existing) {
    if (existing.passwordHash) {
      throw new Error("A profile with that email already exists.");
    }
    const passwordHash = await hashPassword(password);
    const updated = users.map((user) =>
      user.email.toLowerCase() === normalized
        ? { ...user, name: name.trim() || user.name, passwordHash }
        : user,
    );
    await saveUsers(updated);
    return updated.find((user) => user.email.toLowerCase() === normalized) ?? null;
  }

  const newUser: UserProfile = {
    id: crypto.randomUUID(),
    name: name.trim() || normalized.split("@")[0] || "Player",
    email: normalized,
    createdAt: new Date().toISOString(),
    signInMethod: "password",
    passwordHash: await hashPassword(password),
  };
  await saveUsers([...users, newUser]);
  return newUser;
}

export async function signInWithPassword(email: string, password: string): Promise<Session | null> {
  const normalized = email.trim().toLowerCase();
  await seedAdminUserIfMissing();
  const users = await getUsers();
  const directMatch = users.find((user) => user.email.toLowerCase() === normalized);

  // Admin account check (env-var driven only)
  if (normalized === ADMIN_EMAIL.toLowerCase()) {
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (!adminPassword || password !== adminPassword) return null;

    if (!directMatch) {
      await saveUsers([
        ...users,
        {
          id: crypto.randomUUID(),
          name: "Admin",
          email: normalized,
          createdAt: new Date().toISOString(),
          signInMethod: "password",
          passwordHash: await hashPassword(adminPassword),
          role: "admin",
          isAdmin: true,
        },
      ]);
    }
    return createSessionForEmail(normalized);
  }

  // 3. General user check
  if (directMatch?.passwordHash) {
    const expectedHash = await hashPassword(password);
    if (directMatch.passwordHash === expectedHash) {
      return createSessionForEmail(normalized);
    }
    return null;
  }

  return null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function sendMagicLinkEmail(email: string, magicLinkUrl: string) {
  if (!resend) {
    console.warn(
      "RESEND_API_KEY is not configured. Magic link email was not sent. " +
        `In development, use this link directly: ${magicLinkUrl}`,
    );
    return false;
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "dailyroll <onboarding@resend.dev>",
    to: email,
    subject: "Your dailyroll sign-in link",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #101815; border-radius: 16px;">
        <h1 style="color: #e1ece0; font-size: 24px; margin: 0 0 8px;">daily<span style="color: #9bcf9c;">roll</span></h1>
        <p style="color: #9aa99c; font-size: 15px; line-height: 1.6; margin: 16px 0 24px;">
          Click the button below to sign in. This link expires in 15 minutes.
        </p>
        <a href="${magicLinkUrl}" style="display: inline-block; background: #79b77f; color: #122519; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
          Sign in to dailyroll
        </a>
        <p style="color: #718275; font-size: 12px; line-height: 1.6; margin: 24px 0 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
  return true;
}

export async function requestMagicLink(email: string, name?: string) {
  await cleanupExpiredMagicLinks();
  const normalized = email.trim().toLowerCase();
  const token = generateToken();
  const link = {
    token,
    email: normalized,
    name: name?.trim() || undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString(),
    used: false,
  };
  await createMagicLink(link);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const magicLinkUrl = `${baseUrl}/api/auth/email/verify?token=${token}`;
  const emailSent = await sendMagicLinkEmail(normalized, magicLinkUrl);

  // When no email provider is configured (e.g. local development or a fresh
  // deploy without RESEND_API_KEY set), there is no way for the user to
  // receive the link. Surface it directly so sign-in still works instead of
  // silently stranding the user on the "check your email" screen.
  return { magicLinkUrl: emailSent ? null : magicLinkUrl };
}

export async function verifyMagicLink(token: string): Promise<Session | null> {
  const link = await getMagicLink(token);
  if (!link) return null;
  if (link.used) return null;
  if (new Date(link.expiresAt).getTime() < Date.now()) return null;

  await markMagicLinkUsed(token);

  // Ensure the user profile exists.
  const users = await getUsers();
  const existing = users.find(
    (user) => user.email.toLowerCase() === link.email.toLowerCase(),
  );
  if (!existing) {
    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      name: link.name || link.email.split("@")[0] || "Player",
      email: link.email,
      createdAt: new Date().toISOString(),
      signInMethod: "passwordless email",
    };
    await saveUsers([...users, newUser]);
  }

  return createSessionForEmail(link.email);
}