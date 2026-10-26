import "server-only";
import { prisma } from "./db";
import { isRepeat, occurrences, type Repeat } from "./recurrence";

export type CalEvent = {
  id: string;
  occ: string;
  owner_id: string;
  owner_name: string;
  owner_color: string;
  title: string;
  description: string;
  location: string;
  starts_at: Date;
  ends_at: Date;
  all_day: boolean;
  repeat: Repeat;
  color: string | null;
  series_start: Date;
  series_end: Date;
  invitees: Invitee[];
  reminders: number[];
  group_ids: string[];
};

export type Invitee = { user_id: string; name: string; status: "pending" | "accepted" | "declined" };

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  role: "member" | "owner";
  member_count: number;
};

function eventResult(
  event: {
    id: string;
    ownerId: string;
    title: string;
    description: string;
    location: string;
    startsAt: Date;
    endsAt: Date;
    allDay: boolean;
    color: string | null;
    repeat: string;
    owner: { name: string; color: string };
    shares: { groupId: string }[];
    invites: { userId: string; status: string; user: { name: string } }[];
    reminders: { minutes: number }[];
  },
  from: Date,
  to: Date,
): CalEvent[] {
  const repeat = isRepeat(event.repeat) ? event.repeat : "none";
  return occurrences(event.startsAt, event.endsAt, repeat, from, to).map(({ start, end }) => ({
    id: event.id,
    occ: `${event.id}:${start.getTime()}`,
    owner_id: event.ownerId,
    owner_name: event.owner.name,
    owner_color: event.color ?? event.owner.color,
    title: event.title,
    description: event.description,
    location: event.location,
    starts_at: start,
    ends_at: end,
    all_day: event.allDay,
    repeat,
    color: event.color,
    series_start: event.startsAt,
    series_end: event.endsAt,
    invitees: event.invites
      .map((i) => ({ user_id: i.userId, name: i.user.name, status: i.status as Invitee["status"] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    reminders: event.reminders.map((r) => r.minutes).sort((a, b) => a - b),
    group_ids: event.shares.map(({ groupId }) => groupId),
  }));
}

function expand(events: Parameters<typeof eventResult>[0][], from: Date, to: Date) {
  return events
    .flatMap((e) => eventResult(e, from, to))
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
}

const eventInclude = {
  owner: { select: { name: true, color: true } },
  shares: { select: { groupId: true } },
  invites: { select: { userId: true, status: true, user: { select: { name: true } } } },
    reminders: { select: { minutes: true } },
  } as const;

// Repeating events can start long before the range, so only the start bound applies to them.
const inRange = (from: Date, to: Date) => ({
  startsAt: { lt: to },
  OR: [{ repeat: { not: "none" } }, { endsAt: { gte: from } }],
});

export async function myEvents(userId: string, from: Date, to: Date) {
  const events = await prisma.event.findMany({
    where: {
      AND: [
        inRange(from, to),
        { OR: [{ ownerId: userId }, { invites: { some: { userId, status: "accepted" } } }] },
      ],
    },
    include: eventInclude,
  });
  return expand(events, from, to);
}

export async function pendingInvites(userId: string) {
  const rows = await prisma.eventInvite.findMany({
    where: { userId, status: "pending" },
    select: {
      eventId: true,
      event: {
        select: { title: true, startsAt: true, endsAt: true, allDay: true, repeat: true, owner: { select: { name: true } } },
      },
    },
    orderBy: { event: { startsAt: "asc" } },
  });
  return rows.map(({ eventId, event }) => ({
    id: eventId,
    title: event.title,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    all_day: event.allDay,
    repeat: event.repeat,
    owner_name: event.owner.name,
  }));
}

export type Contact = { id: string; name: string; color: string };

export type DueReminder = {
  key: string;
  event_id: string;
  minutes: number;
  occ_start: Date;
  title: string;
};

/** Reminders whose time has come for events that haven't ended yet. `floatingNow` is the user's wall-clock time as UTC. */
export async function dueReminders(userId: string, floatingNow: Date): Promise<DueReminder[]> {
  const events = await prisma.event.findMany({
    where: {
      reminders: { some: {} },
      OR: [{ ownerId: userId }, { invites: { some: { userId, status: "accepted" } } }],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      repeat: true,
      reminders: { select: { minutes: true } },
    },
  });
  const seen = await prisma.reminderSeen.findMany({
    where: { userId },
    select: { eventId: true, minutes: true, occStart: true },
  });
  const seenKeys = new Set(seen.map((s) => `${s.eventId}:${s.minutes}:${s.occStart.getTime()}`));
  const due: DueReminder[] = [];
  for (const event of events) {
    const repeat = isRepeat(event.repeat) ? event.repeat : "none";
    const max = Math.max(...event.reminders.map((r) => r.minutes));
    const to = new Date(floatingNow.getTime() + max * 60000 + 1);
    for (const occ of occurrences(event.startsAt, event.endsAt, repeat, floatingNow, to)) {
      for (const { minutes } of event.reminders) {
        if (floatingNow.getTime() < occ.start.getTime() - minutes * 60000) continue;
        const key = `${event.id}:${minutes}:${occ.start.getTime()}`;
        if (seenKeys.has(key)) continue;
        due.push({ key, event_id: event.id, minutes, occ_start: occ.start, title: event.title });
      }
    }
  }
  return due.sort((a, b) => a.occ_start.getTime() - b.occ_start.getTime() || a.minutes - b.minutes);
}

export async function notificationCount(userId: string, floatingNow: Date) {
  const [pending, responses, reminders] = await Promise.all([
    prisma.eventInvite.count({ where: { userId, status: "pending" } }),
    prisma.eventInvite.count({
      where: { ownerSeen: false, status: { not: "pending" }, event: { ownerId: userId } },
    }),
    dueReminders(userId, floatingNow),
  ]);
  return pending + responses + reminders.length;
}

export async function inviteResponses(userId: string) {
  const rows = await prisma.eventInvite.findMany({
    where: { ownerSeen: false, status: { not: "pending" }, event: { ownerId: userId } },
    select: {
      eventId: true,
      userId: true,
      status: true,
      user: { select: { name: true } },
      event: { select: { title: true, startsAt: true } },
    },
    orderBy: { event: { startsAt: "asc" } },
  });
  return rows.map((r) => ({
    event_id: r.eventId,
    user_id: r.userId,
    name: r.user.name,
    accepted: r.status === "accepted",
    title: r.event.title,
    starts_at: r.event.startsAt,
  }));
}

/** People who share at least one group with the user. */
export async function contacts(userId: string): Promise<Contact[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      disabled: false,
      memberships: { some: { group: { memberships: { some: { userId } } } } },
    },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
  return users;
}

/** Events shared into groups the user belongs to (optionally a single group). */
export async function sharedEvents(userId: string, from: Date, to: Date, groupId?: string) {
  const events = await prisma.event.findMany({
    where: {
      ...inRange(from, to),
      shares: {
        some: {
          ...(groupId ? { groupId } : {}),
          group: { memberships: { some: { userId } } },
        },
      },
    },
    include: eventInclude,
  });
  return expand(events, from, to);
}

export async function myGroups(userId: string): Promise<Group[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { group: { name: "asc" } },
  });
  return memberships.map(({ group, role }) => ({
    id: group.id,
    name: group.name,
    invite_code: group.inviteCode,
    role: role as Group["role"],
    member_count: group._count.memberships,
  }));
}

export function groupMembers(groupIds: string[]) {
  return prisma.groupMember.findMany({
    where: { groupId: { in: groupIds } },
    select: {
      groupId: true,
      role: true,
      user: { select: { name: true, color: true } },
    },
    orderBy: { user: { name: "asc" } },
  }).then((members) =>
    members.map(({ groupId, role, user }) => ({
      group_id: groupId,
      name: user.name,
      color: user.color,
      role,
    })),
  );
}

/* ---------- admin ---------- */

export async function adminUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabled: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { events: true, memberships: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return users.map(({ _count, ...user }) => ({
    ...user,
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt,
    event_count: _count.events,
    group_count: _count.memberships,
  }));
}

export async function adminGroups() {
  const groups = await prisma.group.findMany({
    include: { creator: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return groups.map(({ inviteCode, createdAt, creator, ...group }) => ({
    ...group,
    invite_code: inviteCode,
    created_at: createdAt,
    creator: creator?.name ?? null,
  }));
}

export async function adminGroupMembers() {
  const memberships = await prisma.groupMember.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map(({ groupId, role, user }) => ({
    group_id: groupId,
    user_id: user.id,
    name: user.name,
    email: user.email,
    role,
  }));
}

export async function dashboardStats() {
  const [
    totalUsers,
    disabledUsers,
    newUsers,
    activeUsers,
    groups,
    events,
    shares,
    sessions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { disabled: true } }),
    prisma.user.count({ where: { createdAt: { gt: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.user.count({ where: { lastLoginAt: { gt: new Date(Date.now() - 7 * 86_400_000) } } }),
    prisma.group.count(),
    prisma.event.count(),
    prisma.eventShare.count(),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  const counts = {
    users: totalUsers,
    disabled_users: disabledUsers,
    new_users: newUsers,
    active_users: activeUsers,
    groups,
    events,
    shares,
    sessions,
  };

  const t0 = performance.now();
  const [db] = await prisma.$queryRaw<{
    version: string;
    size: string;
    started: Date;
    connections: bigint;
    max_connections: number;
  }[]>`
    SELECT version(), pg_size_pretty(pg_database_size(current_database())) AS size,
           pg_postmaster_start_time() AS started,
           (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS connections,
           current_setting('max_connections')::int AS max_connections
  `;
  const latencyMs = Math.round(performance.now() - t0);

  const tableRows = await prisma.$queryRaw<{
    name: string;
    rows: bigint;
    size: string;
  }[]>`
    SELECT relname AS name, n_live_tup AS rows,
           pg_size_pretty(pg_total_relation_size(relid)) AS size
      FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC
  `;

  const dailyRows = await prisma.$queryRaw<{
    day: string;
    count: bigint;
  }[]>`
    SELECT to_char(d, 'MM-DD') AS day,
           (SELECT count(*) FROM events WHERE created_at::date = d::date) AS count
      FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d
  `;

  const topUsers = await prisma.user.findMany({
    select: {
      name: true,
      _count: { select: { events: true } },
    },
    orderBy: [{ events: { _count: "desc" } }, { name: "asc" }],
    take: 5,
  });

  return {
    counts,
    db: {
      ...db,
      connections: Number(db.connections),
    },
    latencyMs,
    tables: tableRows.map(({ rows, ...table }) => ({ ...table, rows: Number(rows) })),
    perDay: dailyRows.map(({ count, ...day }) => ({ ...day, count: Number(count) })),
    topUsers: topUsers.map(({ name, _count }) => ({ name, events: _count.events })),
  };
}
