import type {
  AccountType,
  FinanceAccountSummary,
  FinanceDashboardData,
  FinanceTransactionItem,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_TYPES: AccountType[] = ["membership", "base", "lighting", "extra"];

function normalizeName(name: string | null | undefined, fallback: string) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  return fallback;
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Bejelentkezés szükséges.");
  }

  const [profileRes, accountsRes] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("accounts")
      .select("id, account_type, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const accountRows =
    (accountsRes.data as { id: string; account_type: AccountType; is_active: boolean }[] | null) ?? [];

  const accountIds = accountRows.map((row) => row.id);

  let transactionRows: {
    id: string;
    account_id: string;
    amount: number | string;
    status_code: "N" | "H" | "I";
    note: string | null;
    created_at: string;
  }[] = [];

  if (accountIds.length > 0) {
    const transactionsRes = await supabase
      .from("transactions")
      .select("id, account_id, amount, status_code, note, created_at")
      .in("account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(80);

    transactionRows =
      (transactionsRes.data as
        | {
            id: string;
            account_id: string;
            amount: number | string;
            status_code: "N" | "H" | "I";
            note: string | null;
            created_at: string;
          }[]
        | null) ?? [];
  }

  const typeByAccountId = new Map<string, AccountType>();
  accountRows.forEach((row) => {
    typeByAccountId.set(row.id, row.account_type);
  });

  const balancesByType = new Map<AccountType, number>();
  const countByType = new Map<AccountType, number>();
  ACCOUNT_TYPES.forEach((type) => {
    balancesByType.set(type, 0);
    countByType.set(type, 0);
  });

  const transactions: FinanceTransactionItem[] = transactionRows
    .map((row) => {
      const accountType = typeByAccountId.get(row.account_id);
      if (!accountType) {
        return null;
      }

      const amountFt = Number(row.amount);
      balancesByType.set(accountType, (balancesByType.get(accountType) ?? 0) + amountFt);
      countByType.set(accountType, (countByType.get(accountType) ?? 0) + 1);

      return {
        id: row.id,
        accountType,
        amountFt,
        statusCode: row.status_code,
        note: row.note,
        createdAt: row.created_at,
      };
    })
    .filter((item): item is FinanceTransactionItem => item !== null);

  const accountByType = new Map<AccountType, { id: string; isActive: boolean }>();
  accountRows.forEach((row) => {
    accountByType.set(row.account_type, {
      id: row.id,
      isActive: row.is_active,
    });
  });

  const accounts: FinanceAccountSummary[] = ACCOUNT_TYPES.map((type) => {
    const base = accountByType.get(type);

    return {
      accountType: type,
      accountId: base?.id ?? null,
      isActive: base?.isActive ?? false,
      balanceFt: Math.round(balancesByType.get(type) ?? 0),
      transactionCount: countByType.get(type) ?? 0,
    };
  });

  const totalBalanceFt = accounts.reduce((sum, account) => sum + account.balanceFt, 0);

  return {
    userName: normalizeName(profileRes.data?.full_name, user.email ?? "Tag"),
    totalBalanceFt,
    debtFt: Math.max(0, -totalBalanceFt),
    accounts,
    transactions,
  };
}
