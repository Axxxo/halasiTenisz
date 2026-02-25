export type AccountType = "membership" | "base" | "lighting" | "extra";

export type FinanceAccountSummary = {
  accountType: AccountType;
  accountId: string | null;
  isActive: boolean;
  balanceFt: number;
  transactionCount: number;
};

export type FinanceTransactionItem = {
  id: string;
  accountType: AccountType;
  amountFt: number;
  statusCode: "N" | "H" | "I";
  note: string | null;
  createdAt: string;
};

export type FinanceDashboardData = {
  userName: string;
  totalBalanceFt: number;
  debtFt: number;
  accounts: FinanceAccountSummary[];
  transactions: FinanceTransactionItem[];
};
