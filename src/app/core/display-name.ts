import type { User } from 'firebase/auth';

/** Display name from the signed-in Firebase user (live, client-only). */
export function displayNameFromAuthUser(user: User | null | undefined): string | undefined {
  if (!user) {
    return undefined;
  }
  const name = user.displayName?.trim();
  if (name) {
    return name;
  }
  const email = user.email?.trim();
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) {
      return local;
    }
  }
  return undefined;
}

/**
 * Name is shown only when the user has a numeric rating.
 * Prefer `userName` stored on `userRestaurants` at add time; for the current user,
 * fall back to the auth profile when legacy rows lack `userName`.
 */
export function resolveRatedDisplayName(options: {
  userId: string;
  userRate: number | null | undefined;
  storedUserName?: string;
  currentUserId?: string;
  currentAuthUser?: User | null;
}): string | undefined {
  const rate = options.userRate;
  if (rate == null || !Number.isFinite(rate)) {
    return undefined;
  }
  const stored = options.storedUserName?.trim();
  if (stored) {
    return stored;
  }
  if (options.currentUserId && options.userId === options.currentUserId) {
    return displayNameFromAuthUser(options.currentAuthUser) ?? 'You';
  }
  return undefined;
}

/** Name for community rows (e.g. comment-only entries without a list rating). */
export function resolveCommunityDisplayName(options: {
  userId: string;
  storedUserName?: string;
  currentUserId?: string;
  currentAuthUser?: User | null;
}): string | undefined {
  const stored = options.storedUserName?.trim();
  if (stored) {
    return stored;
  }
  if (options.currentUserId && options.userId === options.currentUserId) {
    return displayNameFromAuthUser(options.currentAuthUser) ?? 'You';
  }
  return undefined;
}
