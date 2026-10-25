import "server-only";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "./db";

const COOKIE = "session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  color: string;
};

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [sha256(token), userId, expires],
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return queryOne<User>(
    `SELECT u.id, u.email, u.name, u.role, u.color
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND NOT u.disabled`,
    [sha256(token)],
  );
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/calendar");
  return user;
}

// Simple in-memory throttle for login attempts (per server instance).
const attempts = new Map<string, { count: number; reset: number }>();

export function loginThrottled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) return false;
  return entry.count >= 10;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
  } else {
    entry.count++;
  }
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
