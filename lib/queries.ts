import "server-only";
import { query, queryOne, pool } from "./db";

export type CalEvent = {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_color: string;
  title: string;
  description: string;
  location: string;
  starts_at: Date;
  ends_at: Date;
  all_day: boolean;
  group_ids: string[];
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  role: "member" | "owner";
  member_count: number;
};

const EVENT_COLS = `e.id, e.owner_id, u.name AS owner_name, u.color AS owner_color,
  e.title, e.description, e.location, e.starts_at, e.ends_at, e.all_day,
  COALESCE((SELECT array_agg(group_id) FROM event_shares WHERE event_id = e.id), '{}') AS group_ids`;

export function myEvents(userId: string, from: Date, to: Date) {
  return query<CalEvent>(
    `SELECT ${EVENT_COLS} FROM events e JOIN users u ON u.id = e.owner_id
      WHERE e.owner_id = $1 AND e.starts_at < $3 AND e.ends_at >= $2
      ORDER BY e.starts_at`,
    [userId, from, to],
  );
}

/** Events shared into groups the user belongs to (optionally a single group). */
export function sharedEvents(userId: string, from: Date, to: Date, groupId?: string) {
  return query<CalEvent>(
    `SELECT ${EVENT_COLS} FROM events e JOIN users u ON u.id = e.owner_id
      WHERE e.starts_at < $3 AND e.ends_at >= $2
        AND EXISTS (
          SELECT 1 FROM event_shares es
            JOIN group_members gm ON gm.group_id = es.group_id AND gm.user_id = $1
           WHERE es.event_id = e.id AND ($4::uuid IS NULL OR es.group_id = $4))
      ORDER BY e.starts_at`,
    [userId, from, to, groupId ?? null],
  );
}

export function myGroups(userId: string) {
  return query<Group>(
    `SELECT g.id, g.name, g.invite_code, gm.role,
            (SELECT count(*)::int FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = $1 ORDER BY g.name`,
    [userId],
  );
}

export function groupMembers(groupIds: string[]) {
  return query<{ group_id: string; name: string; color: string; role: string }>(
    `SELECT gm.group_id, u.name, u.color, gm.role
       FROM group_members gm JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ANY($1::uuid[]) ORDER BY u.name`,
    [groupIds],
  );
}

/* ---------- admin ---------- */

export function adminUsers() {
  return query<{
    id: string; email: string; name: string; role: "user" | "admin";
    disabled: boolean; created_at: Date; last_login_at: Date | null;
    event_count: number; group_count: number;
  }>(
    `SELECT u.id, u.email, u.name, u.role, u.disabled, u.created_at, u.last_login_at,
            (SELECT count(*)::int FROM events WHERE owner_id = u.id) AS event_count,
            (SELECT count(*)::int FROM group_members WHERE user_id = u.id) AS group_count
       FROM users u ORDER BY u.created_at`,
  );
}

export function adminGroups() {
  return query<{ id: string; name: string; invite_code: string; created_at: Date; creator: string | null }>(
    `SELECT g.id, g.name, g.invite_code, g.created_at, u.name AS creator
       FROM groups g LEFT JOIN users u ON u.id = g.created_by ORDER BY g.name`,
  );
}

export function adminGroupMembers() {
  return query<{ group_id: string; user_id: string; name: string; email: string; role: string }>(
    `SELECT gm.group_id, u.id AS user_id, u.name, u.email, gm.role
       FROM group_members gm JOIN users u ON u.id = gm.user_id ORDER BY u.name`,
  );
}

export async function dashboardStats() {
  const counts = await queryOne<Record<string, number>>(
    `SELECT (SELECT count(*)::int FROM users) AS users,
            (SELECT count(*)::int FROM users WHERE disabled) AS disabled_users,
            (SELECT count(*)::int FROM users WHERE created_at > now() - interval '7 days') AS new_users,
            (SELECT count(*)::int FROM users WHERE last_login_at > now() - interval '7 days') AS active_users,
            (SELECT count(*)::int FROM groups) AS groups,
            (SELECT count(*)::int FROM events) AS events,
            (SELECT count(*)::int FROM event_shares) AS shares,
            (SELECT count(*)::int FROM sessions WHERE expires_at > now()) AS sessions`,
  );

  const t0 = performance.now();
  const db = await queryOne<{
    version: string; size: string; started: Date; connections: number; max_connections: number;
  }>(
    `SELECT version(), pg_size_pretty(pg_database_size(current_database())) AS size,
            pg_postmaster_start_time() AS started,
            (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS connections,
            current_setting('max_connections')::int AS max_connections`,
  );
  const latencyMs = Math.round(performance.now() - t0);

  const tables = await query<{ name: string; rows: number; size: string }>(
    `SELECT relname AS name, n_live_tup::int AS rows,
            pg_size_pretty(pg_total_relation_size(relid)) AS size
       FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC`,
  );

  const perDay = await query<{ day: string; count: number }>(
    `SELECT to_char(d, 'MM-DD') AS day,
            (SELECT count(*)::int FROM events WHERE created_at::date = d::date) AS count
       FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d`,
  );

  const topUsers = await query<{ name: string; events: number }>(
    `SELECT u.name, count(e.id)::int AS events FROM users u
       LEFT JOIN events e ON e.owner_id = u.id
      GROUP BY u.id ORDER BY events DESC, u.name LIMIT 5`,
  );

  return {
    counts: counts!,
    db: db!,
    latencyMs,
    tables,
    perDay,
    topUsers,
    pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
  };
}
