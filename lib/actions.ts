"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool, query, queryOne } from "./db";
import {
  clearLoginFailures,
  createSession,
  destroySession,
  hashPassword,
  loginThrottled,
  recordLoginFailure,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "./auth";
import { parseLocalInput } from "./dates";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fail = (path: string, msg: string): never =>
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
const COLOR = /^#[0-9a-fA-F]{6}$/;

/* ---------- auth ---------- */

export async function register(fd: FormData) {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const color = COLOR.test(str(fd, "color")) ? str(fd, "color") : "#3b82f6";

  if (!name || name.length > 80) fail("/register", "Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    fail("/register", "Please enter a valid email address.");
  if (password.length < 8 || password.length > 200)
    fail("/register", "Password must be at least 8 characters.");
  if (password !== String(fd.get("confirm") ?? ""))
    fail("/register", "Passwords do not match.");

  const hash = await hashPassword(password);
  // The very first account becomes the administrator.
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (email, name, password_hash, color, role)
     VALUES ($1, $2, $3, $4,
       CASE WHEN EXISTS (SELECT 1 FROM users) THEN 'user' ELSE 'admin' END)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, name, hash, color],
  );
  if (!user) fail("/register", "An account with this email already exists.");
  await createSession(user!.id);
  redirect("/calendar");
}

export async function login(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (loginThrottled(email)) fail("/login", "Too many attempts. Try again later.");

  const user = await queryOne<{ id: string; password_hash: string; disabled: boolean }>(
    "SELECT id, password_hash, disabled FROM users WHERE email = $1",
    [email],
  );
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    recordLoginFailure(email);
    fail("/login", "Invalid email or password.");
  }
  if (user!.disabled) fail("/login", "This account has been disabled.");

  clearLoginFailures(email);
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user!.id]);
  await createSession(user!.id);
  redirect("/calendar");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/* ---------- events ---------- */

async function myGroupIds(userId: string, wanted: string[]): Promise<string[]> {
  if (!wanted.length) return [];
  const rows = await query<{ group_id: string }>(
    "SELECT group_id FROM group_members WHERE user_id = $1 AND group_id = ANY($2::uuid[])",
    [userId, wanted],
  );
  return rows.map((r) => r.group_id);
}

const uuids = (fd: FormData, key: string) =>
  fd.getAll(key).map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));

export async function createEvent(fd: FormData) {
  const user = await requireUser();
  const back = str(fd, "back") === "/shared" ? "/shared" : "/calendar";
  const title = str(fd, "title");
  const allDay = fd.get("all_day") === "on";
  const starts = parseLocalInput(str(fd, "starts_at"), allDay);
  let ends = parseLocalInput(str(fd, "ends_at") || str(fd, "starts_at"), allDay);

  if (!title || title.length > 200) fail(back, "Please enter a title.");
  if (!starts || !ends) return fail(back, "Please enter valid dates.");
  if (allDay) ends = new Date(ends.getTime() + 86_399_000);
  if (ends < starts) fail(back, "The end must not be before the start.");

  const groups = await myGroupIds(user.id, uuids(fd, "groups"));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO events (owner_id, title, description, location, starts_at, ends_at, all_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [user.id, title, str(fd, "description").slice(0, 2000), str(fd, "location").slice(0, 200), starts, ends, allDay],
    );
    for (const g of groups) {
      await client.query("INSERT INTO event_shares (event_id, group_id) VALUES ($1,$2)", [rows[0].id, g]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
  redirect(`${back}?month=${starts.toISOString().slice(0, 7)}`);
}

export async function deleteEvent(fd: FormData) {
  const user = await requireUser();
  await query("DELETE FROM events WHERE id = $1 AND owner_id = $2", [str(fd, "id"), user.id]);
  revalidatePath("/", "layout");
}

export async function setEventShares(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const owned = await queryOne("SELECT 1 FROM events WHERE id = $1 AND owner_id = $2", [id, user.id]);
  if (!owned) return;
  const groups = await myGroupIds(user.id, uuids(fd, "groups"));
  await query("DELETE FROM event_shares WHERE event_id = $1", [id]);
  for (const g of groups) {
    await query("INSERT INTO event_shares (event_id, group_id) VALUES ($1,$2)", [id, g]);
  }
  revalidatePath("/", "layout");
}

/* ---------- groups ---------- */

const newInviteCode = () => randomBytes(5).toString("hex").toUpperCase();

export async function createGroup(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name");
  if (!name || name.length > 80) fail("/groups", "Please enter a group name.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO groups (name, invite_code, created_by) VALUES ($1,$2,$3) RETURNING id",
      [name, newInviteCode(), user.id],
    );
    await client.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'owner')",
      [rows[0].id, user.id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/groups");
  redirect("/groups");
}

export async function joinGroup(fd: FormData) {
  const user = await requireUser();
  const code = str(fd, "code").toUpperCase();
  const group = await queryOne<{ id: string }>("SELECT id FROM groups WHERE invite_code = $1", [code]);
  if (!group) fail("/groups", "Invalid invite code.");
  await query(
    "INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [group!.id, user.id],
  );
  revalidatePath("/", "layout");
  redirect("/groups");
}

export async function leaveGroup(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  await query("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [id, user.id]);
  await query(
    `DELETE FROM event_shares es USING events e
      WHERE es.event_id = e.id AND e.owner_id = $1 AND es.group_id = $2`,
    [user.id, id],
  );
  revalidatePath("/", "layout");
}

export async function regenerateInvite(fd: FormData) {
  const user = await requireUser();
  await query(
    `UPDATE groups SET invite_code = $3
      WHERE id = $1 AND EXISTS (
        SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = 'owner')`,
    [str(fd, "id"), user.id, newInviteCode()],
  );
  revalidatePath("/groups");
}

/* ---------- admin ---------- */

export async function adminSetRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  const role = str(fd, "role") === "admin" ? "admin" : "user";
  await query("UPDATE users SET role = $2 WHERE id = $1", [id, role]);
  revalidatePath("/admin", "layout");
}

export async function adminSetDisabled(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  const disabled = str(fd, "disabled") === "true";
  await query("UPDATE users SET disabled = $2 WHERE id = $1", [id, disabled]);
  if (disabled) await query("DELETE FROM sessions WHERE user_id = $1", [id]);
  revalidatePath("/admin", "layout");
}

export async function adminResetPassword(fd: FormData) {
  await requireAdmin();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return;
  const id = str(fd, "id");
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, await hashPassword(password)]);
  await query("DELETE FROM sessions WHERE user_id = $1", [id]);
  revalidatePath("/admin", "layout");
}

export async function adminDeleteUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  await query("DELETE FROM users WHERE id = $1", [id]);
  revalidatePath("/admin", "layout");
}

export async function adminDeleteGroup(fd: FormData) {
  await requireAdmin();
  await query("DELETE FROM groups WHERE id = $1", [str(fd, "id")]);
  revalidatePath("/admin", "layout");
}

export async function adminAddMember(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (user) {
    await query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [str(fd, "group_id"), user.id],
    );
  }
  revalidatePath("/admin", "layout");
}

export async function adminRemoveMember(fd: FormData) {
  await requireAdmin();
  const group = str(fd, "group_id");
  const user = str(fd, "user_id");
  await query("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [group, user]);
  await query(
    `DELETE FROM event_shares es USING events e
      WHERE es.event_id = e.id AND e.owner_id = $1 AND es.group_id = $2`,
    [user, group],
  );
  revalidatePath("/admin", "layout");
}
