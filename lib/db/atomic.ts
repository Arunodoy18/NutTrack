import { neonSql } from "@/lib/db";

/**
 * "Check the limit, then insert" is not safe when a person taps twice or two phones sync at once: both checks pass,
 * both inserts happen. These run the check and the insert in one transaction, serialised per person by an advisory lock.
 */

/** Add a drink unless it would take the day's total past `capMl`. */
export async function insertWaterWithinCap(a: { id: string; userId: string; amountMl: number; at: Date; windowStart: Date; capMl: number }): Promise<"ok" | "duplicate" | "over"> {
  const [, ins] = await neonSql.transaction([
    neonSql`select pg_advisory_xact_lock(hashtext(${"water:" + a.userId}))`,
    neonSql`insert into water_logs (id, user_id, amount_ml, "timestamp")
            select ${a.id}, ${a.userId}, ${a.amountMl}, ${a.at.toISOString()}::timestamp
            where (select coalesce(sum(amount_ml), 0) from water_logs where user_id = ${a.userId} and "timestamp" >= ${a.windowStart.toISOString()}::timestamp) + ${a.amountMl} <= ${a.capMl}
            on conflict (id) do nothing
            returning id`,
  ]);
  if ((ins as any[]).length) return "ok";
  const existing = await neonSql`select 1 from water_logs where id = ${a.id} limit 1`;
  return (existing as any[]).length ? "duplicate" : "over";
}

/** Add a family member unless the account already has `max` people (itself included). */
export async function insertProfileWithinLimit(a: { id: string; ownerId: string; name: string; email: string; relation: string; avatar: string; max: number }): Promise<boolean> {
  const [, ins] = await neonSql.transaction([
    neonSql`select pg_advisory_xact_lock(hashtext(${"family:" + a.ownerId}))`,
    neonSql`insert into "user" (id, name, email, parent_id, relation, avatar, is_verified)
            select ${a.id}, ${a.name}, ${a.email}, ${a.ownerId}, ${a.relation}, ${a.avatar}, true
            where (select count(*) from "user" where id = ${a.ownerId} or parent_id = ${a.ownerId}) < ${a.max}
            returning id`,
  ]);
  return (ins as any[]).length > 0;
}
