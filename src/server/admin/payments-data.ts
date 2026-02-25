import type {
  AdminMemberPaymentSummary,
  AdminPaymentTransactionItem,
  AdminPaymentsActionResult,
  AdminPaymentsData,
} from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { requireAdminContext } from "@/server/admin/require-admin";

function normalizeName(name: string | null | undefined, fallback: string) {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

export async function listAdminPaymentsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminPaymentsData> {
  const [usersRes, accountsRes] = await Promise.all([
    supabase.from("users").select("id, email, full_name").order("full_name", { ascending: true }),
    supabase.from("accounts").select("id, user_id, account_type"),
  ]);

  const users = (usersRes.data ?? []) as {
    id: string;
    email: string;
    full_name: string | null;
  }[];

  const accounts = (accountsRes.data ?? []) as {
    id: string;
    user_id: string;
    account_type: "membership" | "base" | "lighting" | "extra";
  }[];

  const accountIds = accounts.map((account) => account.id);
  const accountToUser = new Map<string, string>();
  const accountTypeById = new Map<string, "membership" | "base" | "lighting" | "extra">();

  accounts.forEach((account) => {
    accountToUser.set(account.id, account.user_id);
    accountTypeById.set(account.id, account.account_type);
  });

  let transactions: {
    id: string;
    account_id: string;
    amount: number | string;
    note: string | null;
    created_at: string;
  }[] = [];

  if (accountIds.length > 0) {
    const txRes = await supabase
      .from("transactions")
      .select("id, account_id, amount, note, created_at")
      .in("account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(300);

    transactions = (txRes.data ?? []) as {
      id: string;
      account_id: string;
      amount: number | string;
      note: string | null;
      created_at: string;
    }[];
  }

  const nameByUserId = new Map<string, string>();
  users.forEach((user) => {
    nameByUserId.set(user.id, normalizeName(user.full_name, user.email));
  });

  const balanceByUser = new Map<string, number>();
  transactions.forEach((transaction) => {
    const userId = accountToUser.get(transaction.account_id);
    if (!userId) {
      return;
    }

    balanceByUser.set(userId, (balanceByUser.get(userId) ?? 0) + Number(transaction.amount));
  });

  const members: AdminMemberPaymentSummary[] = users
    .map((user) => {
      const balanceFt = Math.round(balanceByUser.get(user.id) ?? 0);
      return {
        userId: user.id,
        fullName: normalizeName(user.full_name, user.email),
        email: user.email,
        balanceFt,
        debtFt: Math.max(0, -balanceFt),
      };
    })
    .sort((a, b) => b.debtFt - a.debtFt || a.fullName.localeCompare(b.fullName));

  const txItems: AdminPaymentTransactionItem[] = transactions
    .map((transaction) => {
      const userId = accountToUser.get(transaction.account_id);
      const accountType = accountTypeById.get(transaction.account_id);

      if (!userId || !accountType) {
        return null;
      }

      return {
        id: transaction.id,
        userId,
        userName: nameByUserId.get(userId) ?? "Ismeretlen tag",
        accountType,
        amountFt: Math.round(Number(transaction.amount)),
        note: transaction.note,
        createdAt: transaction.created_at,
      };
    })
    .filter((item): item is AdminPaymentTransactionItem => item !== null);

  return {
    members,
    transactions: txItems,
  };
}

export async function getAdminPaymentsData(): Promise<AdminPaymentsActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return {
      ok: false,
      error: adminContext.error,
    };
  }

  return {
    ok: true,
    data: await listAdminPaymentsData(adminContext.supabase),
  };
}
