import type { AdminMemberItem, AdminMembersActionResult, MemberCategory } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/server/admin/require-admin";

function normalizeName(name: string | null | undefined, fallback: string) {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "member" | "admin";
  member_category: MemberCategory | null;
  is_active: boolean;
  membership_requested: boolean | null;
};

function isMissingMembershipRequestedColumnError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("membership_requested") && normalized.includes("does not exist");
}

function isMissingSyncFunctionError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("sync_missing_auth_users") &&
    (normalized.includes("does not exist") || normalized.includes("could not find the function"))
  );
}

async function fetchUsersWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<UserRow[]> {
  const usersRes = await supabase
    .from("users")
    .select("id, email, full_name, role, member_category, is_active, membership_requested")
    .order("created_at", { ascending: true });

  if (!usersRes.error) {
    return ((usersRes.data ?? []) as UserRow[]);
  }

  if (!isMissingMembershipRequestedColumnError(usersRes.error.message)) {
    throw new Error("A felhasználók listázása sikertelen.");
  }

  const fallbackUsersRes = await supabase
    .from("users")
    .select("id, email, full_name, role, member_category, is_active")
    .order("created_at", { ascending: true });

  if (fallbackUsersRes.error) {
    throw new Error("A felhasználók listázása sikertelen.");
  }

  return ((fallbackUsersRes.data ?? []) as Omit<UserRow, "membership_requested">[]).map((row) => ({
    ...row,
    membership_requested: false,
  }));
}

export async function listAdminMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminMemberItem[]> {
  const [users, accountsRes] = await Promise.all([
    fetchUsersWithFallback(supabase),
    supabase.from("accounts").select("id, user_id"),
  ]);

  if (accountsRes.error) {
    throw new Error("A felhasználói fiókok listázása sikertelen.");
  }

  const accounts = (accountsRes.data ?? []) as {
    id: string;
    user_id: string;
  }[];

  const accountIds = accounts.map((account) => account.id);
  const accountToUser = new Map<string, string>();
  accounts.forEach((account) => {
    accountToUser.set(account.id, account.user_id);
  });

  const balanceByUser = new Map<string, number>();

  if (accountIds.length > 0) {
    const transactionsRes = await supabase.from("transactions").select("account_id, amount").in("account_id", accountIds);

    if (transactionsRes.error) {
      throw new Error("A pénzügyi adatok listázása sikertelen.");
    }

    (transactionsRes.data ?? []).forEach((row) => {
      const accountId = String(row.account_id);
      const userId = accountToUser.get(accountId);
      if (!userId) {
        return;
      }

      const amount = Number(row.amount);
      balanceByUser.set(userId, (balanceByUser.get(userId) ?? 0) + amount);
    });
  }

  return users
    .map((user) => {
      const balanceFt = Math.round(balanceByUser.get(user.id) ?? 0);
      return {
        id: user.id,
        fullName: normalizeName(user.full_name, user.email),
        email: user.email,
        role: user.role,
        memberCategory: (user.member_category ?? "palyaberlo") as MemberCategory,
        isActive: user.is_active,
        membershipRequested: Boolean(user.membership_requested),
        balanceFt,
        debtFt: Math.max(0, -balanceFt),
      };
    })
    .sort((a, b) => b.debtFt - a.debtFt || a.fullName.localeCompare(b.fullName));
}

export async function getAdminMembersData(): Promise<AdminMembersActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  const syncRes = await adminContext.supabase.rpc("sync_missing_auth_users");

  if (syncRes.error && !isMissingSyncFunctionError(syncRes.error.message)) {
    return {
      ok: false,
      error: "A regisztrált felhasználók szinkronizálása sikertelen.",
    };
  }

  try {
    return {
      ok: true,
      data: await listAdminMembers(adminContext.supabase),
    };
  } catch {
    return {
      ok: false,
      error: "A taglista betöltése sikertelen.",
    };
  }
}
