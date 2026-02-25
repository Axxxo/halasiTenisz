type QueryableSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<unknown>;
      in: (column: string, values: string[]) => PromiseLike<unknown>;
    };
  };
};

export async function getUserDebtFt(supabase: unknown, userId: string): Promise<number> {
  const client = supabase as QueryableSupabase;

  const { data: accountRows, error: accountsError } = (await client
    .from("accounts")
    .select("id")
    .eq("user_id", userId)) as { data: { id: string }[] | null; error: unknown };

  if (accountsError || !accountRows || accountRows.length === 0) {
    return 0;
  }

  const accountIds = accountRows.map((row) => row.id);

  const { data: transactionRows, error: transactionsError } = (await client
    .from("transactions")
    .select("amount")
    .in("account_id", accountIds)) as { data: { amount: number }[] | null; error: unknown };

  if (transactionsError || !transactionRows || transactionRows.length === 0) {
    return 0;
  }

  const total = transactionRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const debt = Math.max(0, -total);

  return Math.round(debt);
}
