import { createClient } from "@/lib/supabase/server";
import { loadFeeRules } from "@/server/booking/fee-settings";
import { getFinanceDashboardData } from "@/server/finance/dashboard-data";

const ACCOUNT_LABELS = {
  membership: "Tagdíj",
  base: "Alap pályadíj",
  lighting: "Világítás",
  extra: "Extra",
} as const;

const STATUS_LABELS = {
  N: "Normál",
  H: "Határidőn túli",
  I: "Info",
} as const;

function formatFt(value: number) {
  return `${new Intl.NumberFormat("hu-HU").format(value)} Ft`;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function StatisticsPage() {
  let data;
  let debtLockoutFt = 5000;

  try {
    const supabase = await createClient();
    const [dashboardData, feeRules] = await Promise.all([
      getFinanceDashboardData(),
      loadFeeRules(supabase),
    ]);
    data = dashboardData;
    debtLockoutFt = feeRules.debtLockoutFt;
  } catch (error) {
    return (
      <section className="shell-container py-10">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
          Játékos statisztika
        </h1>
        <div className="mt-6 soft-card p-5 text-foreground/80">
          {(error as Error).message || "A statisztika betöltése sikertelen."}
        </div>
      </section>
    );
  }

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Játékos statisztika
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        {data.userName}, itt látod a 4 folyószámlád egyenlegét és a legutóbbi tranzakcióidat.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="soft-card p-5">
          <p className="text-sm text-foreground/70">Összesített egyenleg</p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-5xl text-primary-strong">
            {formatFt(data.totalBalanceFt)}
          </p>
        </article>

        <article className="soft-card p-5">
          <p className="text-sm text-foreground/70">Aktuális tartozás</p>
          <p
            className={`mt-2 font-[family-name:var(--font-heading)] text-5xl ${
              data.debtFt > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {formatFt(data.debtFt)}
          </p>
          <p className="mt-2 text-sm text-foreground/65">
            {formatFt(debtLockoutFt)} felett a rendszer blokkolja az új pályafoglalást.
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.accounts.map((account) => (
          <article key={account.accountType} className="soft-card p-5">
            <p className="text-sm font-semibold text-primary">{ACCOUNT_LABELS[account.accountType]}</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
              {formatFt(account.balanceFt)}
            </p>
            <p className="mt-1 text-sm text-foreground/65">
              Tranzakciók: {account.transactionCount}
            </p>
            <p className="mt-2 text-xs">
              <span
                className={`rounded-full px-2 py-1 font-semibold ${
                  account.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {account.isActive ? "Aktív" : "Nincs beállítva"}
              </span>
            </p>
          </article>
        ))}
      </div>

      <section className="mt-8">
        <div className="soft-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-semibold text-primary-strong">Legutóbbi tranzakciók</h2>
          </div>

          {data.transactions.length === 0 ? (
            <p className="p-5 text-sm text-foreground/70">Még nincs megjeleníthető tranzakció.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-muted/60 text-left text-foreground/75">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Dátum</th>
                    <th className="px-4 py-3 font-semibold">Számla</th>
                    <th className="px-4 py-3 font-semibold">Összeg</th>
                    <th className="px-4 py-3 font-semibold">Státusz</th>
                    <th className="px-4 py-3 font-semibold">Megjegyzés</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-border/80">
                      <td className="px-4 py-3">{formatDateTime(tx.createdAt)}</td>
                      <td className="px-4 py-3">{ACCOUNT_LABELS[tx.accountType]}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          tx.amountFt < 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {formatFt(tx.amountFt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            tx.statusCode === "H"
                              ? "bg-amber-100 text-amber-700"
                              : tx.statusCode === "I"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {STATUS_LABELS[tx.statusCode]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/75">{tx.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
