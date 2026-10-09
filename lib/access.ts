import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { and, eq, or } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Cookie holding which family member is currently being tracked. */
export const ACTIVE_PROFILE_COOKIE = "nura_active";
/** Max profiles per account, including the account holder. */
export const MAX_PROFILES = 6;

export interface ProfileSummary {
  id: string;
  name: string;
  avatar: string | null;
  relation: string | null;
  age: number | null;
  isOwner: boolean;
  profileComplete: boolean;
}

/** The signed-in account holder (never a managed profile), or null. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * May `sessionUserId` read/write data belonging to `targetId`?
 * Yes for itself and for managed profiles it owns — nothing else.
 */
export async function canAccessProfile(sessionUserId: string, targetId: string): Promise<boolean> {
  if (!sessionUserId || !targetId) return false;
  if (sessionUserId === targetId) {
    const self = await db.query.users.findFirst({ where: eq(users.id, sessionUserId), columns: { id: true } });
    return !!self;
  }
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, targetId), eq(users.parentId, sessionUserId)),
    columns: { id: true },
  });
  return !!row;
}

/** The account that owns a profile (itself, unless it is a managed profile). Billing, premium and scan limits belong here. */
export async function ownerOf(userId: string): Promise<string> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true, parentId: true } });
  return row?.parentId ?? userId;
}

/** All profiles the account can switch between: the holder first, then family members by age order of creation. */
export async function listProfiles(sessionUserId: string): Promise<ProfileSummary[]> {
  const rows = await db.query.users.findMany({
    where: or(eq(users.id, sessionUserId), eq(users.parentId, sessionUserId)),
    columns: { id: true, name: true, avatar: true, relation: true, age: true, parentId: true, profileComplete: true, createdAt: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  const mapped = rows.map((r) => ({
    id: r.id,
    name: (r.name || "").trim() || "Me",
    avatar: r.avatar,
    relation: r.relation,
    age: r.age,
    isOwner: r.id === sessionUserId,
    profileComplete: !!r.profileComplete,
  }));
  return mapped.sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
}

/**
 * Which profile is the app showing right now? Reads the cookie but never trusts it:
 * it must be the account holder or one of their own managed profiles.
 */
export async function getActiveProfileId(sessionUserId: string): Promise<string> {
  try {
    const wanted = cookies().get(ACTIVE_PROFILE_COOKIE)?.value;
    if (wanted && wanted !== sessionUserId && (await canAccessProfile(sessionUserId, wanted))) return wanted;
  } catch {
    /* cookies() is unavailable outside a request */
  }
  return sessionUserId;
}

/** Convenience for server actions/pages: session user + active profile, or null when signed out. */
export async function getActor(): Promise<{ sessionUserId: string; activeId: string } | null> {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return null;
  return { sessionUserId, activeId: await getActiveProfileId(sessionUserId) };
}
