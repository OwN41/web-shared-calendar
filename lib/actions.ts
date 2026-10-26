"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Prisma } from "@prisma/client";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { prisma } from "./db";
import {
  clearLoginFailures,
  createSession,
  destroyOtherSessions,
  destroySession,
  hashPassword,
  loginThrottled,
  recordLoginFailure,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "./auth";
import { parseLocalInput } from "./dates";
import { TZ_COOKIE, floatingNow } from "./clock";
import { dueReminders } from "./queries";
import { isRepeat } from "./recurrence";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fail = (path: string, msg: string): never =>
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
const COLOR = /^#[0-9a-fA-F]{6}$/;

/* ---------- language ---------- */

export async function setLocale(fd: FormData) {
  const locale = str(fd, "locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 86_400,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setHiddenWaste(types: string[]) {
  const clean = types.filter((x) => typeof x === "string").slice(0, 50);
  (await cookies()).set("wasteHidden", JSON.stringify(clean), {
    path: "/",
    maxAge: 365 * 86_400,
    sameSite: "lax",
  });
}

/* ---------- auth ---------- */

export async function register(fd: FormData) {
  const t = await getTranslations("errors");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const color = COLOR.test(str(fd, "color")) ? str(fd, "color") : "#3b82f6";

  if (!name || name.length > 80) fail("/register", t("name"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    fail("/register", t("email"));
  if (password.length < 8 || password.length > 200)
    fail("/register", t("passwordShort"));
  if (password !== String(fd.get("confirm") ?? ""))
    fail("/register", t("passwordMismatch"));

  const hash = await hashPassword(password);
  // The very first account becomes the administrator.
  let user: { id: string };
  try {
    user = await prisma.$transaction(async (tx) => {
      const role = (await tx.user.count()) === 0 ? "admin" : "user";
      return tx.user.create({
        data: { email, name, passwordHash: hash, color, role },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      fail("/register", t("emailTaken"));
    }
    throw error;
  }
  await createSession(user.id);
  redirect("/calendar");
}

export async function login(fd: FormData) {
  const t = await getTranslations("errors");
  const email = str(fd, "login").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (loginThrottled(email)) fail("/login", t("tooManyAttempts"));

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, disabled: true },
  });
  if (!user) {
    recordLoginFailure(email);
    return fail("/login", t("invalidLogin"));
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    recordLoginFailure(email);
    return fail("/login", t("invalidLogin"));
  }
  if (user.disabled) return fail("/login", t("disabled"));

  clearLoginFailures(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect("/calendar");
}

export async function updateColor(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const color = str(fd, "color");
  if (!COLOR.test(color)) fail("/settings", t("color"));
  await prisma.user.update({ where: { id: user.id }, data: { color } });
  revalidatePath("/", "layout");
  redirect("/settings?saved=color");
}

export async function updateProfile(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();

  if (!name || name.length > 80) fail("/settings", t("name"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("/settings", t("email"));

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, passwordHash: true },
  });
  if (email !== current.email) {
    if (loginThrottled(`pw:${user.id}`)) fail("/settings", t("tooManyAttempts"));
    if (!(await verifyPassword(String(fd.get("current_password") ?? ""), current.passwordHash))) {
      recordLoginFailure(`pw:${user.id}`);
      fail("/settings", t("currentPassword"));
    }
    clearLoginFailures(`pw:${user.id}`);
  }

  try {
    await prisma.user.update({ where: { id: user.id },     data: { name, email } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          fail("/settings", t("emailTaken"));
    }
    throw error;
  }
  revalidatePath("/", "layout");
  redirect("/settings?saved=profile");
}

export async function changePassword(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const next = String(fd.get("new_password") ?? "");
  if (next.length < 8 || next.length > 200) fail("/settings", t("passwordShort"));
  if (next !== String(fd.get("confirm") ?? "")) fail("/settings", t("passwordMismatch"));

  if (loginThrottled(`pw:${user.id}`)) fail("/settings", t("tooManyAttempts"));
  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(String(fd.get("current_password") ?? ""), passwordHash))) {
    recordLoginFailure(`pw:${user.id}`);
    fail("/settings", t("currentPassword"));
  }
  clearLoginFailures(`pw:${user.id}`);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await destroyOtherSessions(user.id);
  redirect("/settings?saved=password");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/* ---------- events ---------- */

async function myGroupIds(userId: string, wanted: string[]): Promise<string[]> {
  if (!wanted.length) return [];
  const rows = await prisma.groupMember.findMany({
    where: { userId, groupId: { in: wanted } },
    select: { groupId: true },
  });
  return rows.map(({ groupId }) => groupId);
}

const uuids = (fd: FormData, key: string) =>
  fd.getAll(key).map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));

/** Only people sharing a group with the inviter can be invited. */
async function allowedInvitees(userId: string, wanted: string[]): Promise<string[]> {
  if (!wanted.length) return [];
  const rows = await prisma.user.findMany({
    where: {
      id: { in: wanted, not: userId },
      disabled: false,
      memberships: { some: { group: { memberships: { some: { userId } } } } },
    },
    select: { id: true },
  });
  return rows.map(({ id }) => id);
}

const MAX_REMINDER_MINUTES = 525_600;

function readReminders(fd: FormData): number[] {
  const set = new Set<number>();
  for (const v of fd.getAll("reminders")) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= MAX_REMINDER_MINUTES) set.add(n);
  }
  return [...set].slice(0, 20);
}

function readEvent(fd: FormData, back: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const title = str(fd, "title");
  const allDay = fd.get("all_day") === "on";
  const starts = parseLocalInput(str(fd, "starts_at"), allDay);
  let ends = parseLocalInput(str(fd, "ends_at") || str(fd, "starts_at"), allDay);

  if (!title || title.length > 200) fail(back, t("eventTitle"));
  if (!starts || !ends) return fail(back, t("eventDates"));
  if (allDay) ends = new Date(ends.getTime() + 86_399_000);
  if (ends < starts) fail(back, t("eventEnd"));

  return {
    starts,
    data: {
      title,
      description: str(fd, "description").slice(0, 2000),
      location: str(fd, "location").slice(0, 200),
      startsAt: starts,
      endsAt: ends,
      allDay,
      color: COLOR.test(str(fd, "color")) ? str(fd, "color") : null,
      repeat: isRepeat(str(fd, "repeat")) ? str(fd, "repeat") : "none",
    },
  };
}

export async function createEvent(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const back = str(fd, "back") === "/shared" ? "/shared" : "/calendar";
  const { starts, data } = readEvent(fd, back, t);

  const groups = await myGroupIds(user.id, uuids(fd, "groups"));
  const invitees = await allowedInvitees(user.id, uuids(fd, "invitees"));
  const reminders = readReminders(fd);
  await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: { ownerId: user.id, ...data },
      select: { id: true },
    });
    if (groups.length) {
      await tx.eventShare.createMany({
        data: groups.map((groupId) => ({ eventId: event.id, groupId })),
      });
    }
    if (invitees.length) {
      await tx.eventInvite.createMany({
        data: invitees.map((userId) => ({ eventId: event.id, userId })),
      });
    }
    if (reminders.length) {
      await tx.eventReminder.createMany({
        data: reminders.map((minutes) => ({ eventId: event.id, minutes })),
      });
    }
  });
  revalidatePath("/", "layout");
  redirect(`${back}?month=${starts.toISOString().slice(0, 7)}`);
}

export async function updateEvent(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const back = str(fd, "back") === "/shared" ? "/shared" : "/calendar";
  const id = str(fd, "id");
  const { starts, data } = readEvent(fd, back, t);

  const owned = await prisma.event.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
  if (!owned) return fail(back, t("eventNotFound"));

  const groups = await myGroupIds(user.id, uuids(fd, "groups"));
  const invitees = await allowedInvitees(user.id, uuids(fd, "invitees"));
  const reminders = readReminders(fd);
  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id }, data });
    await tx.eventShare.deleteMany({ where: { eventId: id } });
    if (groups.length) {
      await tx.eventShare.createMany({
        data: groups.map((groupId) => ({ eventId: id, groupId })),
      });
    }
    // Existing invitees keep their answer; only removed ones are deleted and new ones added.
    await tx.eventInvite.deleteMany({ where: { eventId: id, userId: { notIn: invitees } } });
    if (invitees.length) {
      await tx.eventInvite.createMany({
        data: invitees.map((userId) => ({ eventId: id, userId })),
        skipDuplicates: true,
      });
    }
    await tx.eventReminder.deleteMany({ where: { eventId: id } });
    if (reminders.length) {
      await tx.eventReminder.createMany({
        data: reminders.map((minutes) => ({ eventId: id, minutes })),
      });
    }
  });
  revalidatePath("/", "layout");
  redirect(`${back}?month=${starts.toISOString().slice(0, 7)}`);
}

export async function respondInvite(fd: FormData) {
  const user = await requireUser();
  const status = str(fd, "answer") === "accept" ? "accepted" : "declined";
  await prisma.eventInvite.updateMany({
    where: { eventId: str(fd, "id"), userId: user.id },
    data: { status, ownerSeen: false },
  });
  revalidatePath("/", "layout");
}

export async function setTimezone(offset: number) {
  if (!Number.isInteger(offset) || Math.abs(offset) > 14 * 60) return;
  (await cookies()).set(TZ_COOKIE, String(offset), { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Dismiss one due reminder by key, or all currently due reminders when no key is given. */
export async function dismissReminders(fd: FormData) {
  const user = await requireUser();
  const key = str(fd, "key");
  const due = await dueReminders(user.id, await floatingNow());
  const rows = due.filter((d) => !key || d.key === key);
  if (rows.length) {
    await prisma.reminderSeen.createMany({
      data: rows.map((d) => ({
        userId: user.id,
        eventId: d.event_id,
        minutes: d.minutes,
        occStart: d.occ_start,
      })),
      skipDuplicates: true,
    });
  }
  revalidatePath("/", "layout");
}

export async function dismissResponses(fd: FormData) {
  const user = await requireUser();
  const eventId = str(fd, "id");
  const userId = str(fd, "user");
  await prisma.eventInvite.updateMany({
    where: {
      ownerSeen: false,
      event: { ownerId: user.id },
      ...(eventId ? { eventId } : {}),
      ...(userId ? { userId } : {}),
    },
    data: { ownerSeen: true },
  });
  revalidatePath("/", "layout");
}

export async function deleteEvent(fd: FormData) {
  const user = await requireUser();
  await prisma.event.deleteMany({ where: { id: str(fd, "id"), ownerId: user.id } });
  revalidatePath("/", "layout");
}

export async function setEventShares(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const owned = await prisma.event.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!owned) return;
  const groups = await myGroupIds(user.id, uuids(fd, "groups"));
  await prisma.$transaction(async (tx) => {
    await tx.eventShare.deleteMany({ where: { eventId: id } });
    if (groups.length) {
      await tx.eventShare.createMany({
        data: groups.map((groupId) => ({ eventId: id, groupId })),
      });
    }
  });
  revalidatePath("/", "layout");
}

/* ---------- groups ---------- */

const newInviteCode = () => randomBytes(5).toString("hex").toUpperCase();

export async function createGroup(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const name = str(fd, "name");
  if (!name || name.length > 80) fail("/groups", t("groupName"));
  await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: { name, inviteCode: newInviteCode(), createdBy: user.id },
      select: { id: true },
    });
    await tx.groupMember.create({
      data: { groupId: group.id, userId: user.id, role: "owner" },
    });
  });
  revalidatePath("/groups");
  redirect("/groups");
}

export async function joinGroup(fd: FormData) {
  const user = await requireUser();
  const t = await getTranslations("errors");
  const code = str(fd, "code").toUpperCase();
  const group = await prisma.group.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!group) return fail("/groups", t("inviteCode"));
  await prisma.groupMember.createMany({
    data: [{ groupId: group.id, userId: user.id }],
    skipDuplicates: true,
  });
  revalidatePath("/", "layout");
  redirect("/groups");
}

export async function leaveGroup(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  await prisma.groupMember.deleteMany({ where: { groupId: id, userId: user.id } });
  await prisma.eventShare.deleteMany({
    where: { groupId: id, event: { ownerId: user.id } },
  });
  revalidatePath("/", "layout");
}

export async function regenerateInvite(fd: FormData) {
  const user = await requireUser();
  await prisma.group.updateMany({
    where: {
      id: str(fd, "id"),
      memberships: { some: { userId: user.id, role: "owner" } },
    },
    data: { inviteCode: newInviteCode() },
  });
  revalidatePath("/groups");
}

/* ---------- admin ---------- */

export async function adminSetRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  const role = str(fd, "role") === "admin" ? "admin" : "user";
  await prisma.user.updateMany({ where: { id }, data: { role } });
  revalidatePath("/admin", "layout");
}

export async function adminSetDisabled(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  const disabled = str(fd, "disabled") === "true";
  await prisma.user.updateMany({ where: { id }, data: { disabled } });
  if (disabled) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin", "layout");
}

export async function adminResetPassword(fd: FormData) {
  await requireAdmin();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return;
  const id = str(fd, "id");
  await prisma.user.updateMany({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin", "layout");
}

export async function adminDeleteUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) return;
  await prisma.user.deleteMany({ where: { id } });
  revalidatePath("/admin", "layout");
}

export async function adminDeleteGroup(fd: FormData) {
  await requireAdmin();
  await prisma.group.deleteMany({ where: { id: str(fd, "id") } });
  revalidatePath("/admin", "layout");
}

export async function adminAddMember(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    await prisma.groupMember.createMany({
      data: [{ groupId: str(fd, "group_id"), userId: user.id }],
      skipDuplicates: true,
    });
  }
  revalidatePath("/admin", "layout");
}

export async function adminRemoveMember(fd: FormData) {
  await requireAdmin();
  const group = str(fd, "group_id");
  const user = str(fd, "user_id");
  await prisma.groupMember.deleteMany({ where: { groupId: group, userId: user } });
  await prisma.eventShare.deleteMany({
    where: { groupId: group, event: { ownerId: user } },
  });
  revalidatePath("/admin", "layout");
}
