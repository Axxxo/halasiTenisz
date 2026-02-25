import { AdminNav } from "@/components/admin/admin-nav";
import { PaymentsManager } from "@/components/admin/payments-manager";
import { createManualTransactionAction } from "@/server/actions/admin-payments-actions";
import { getAdminPaymentsData } from "@/server/admin/payments-data";

export default async function AdminPaymentsPage() {
  const result = await getAdminPaymentsData();

  return (
    <section className="shell-container py-10 space-y-5">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">Admin felület</h1>
      <p className="max-w-3xl text-foreground/80">Pénzügyi egyenlegek és tranzakciók kezelése.</p>

      <AdminNav activeHref="/admin/penzugyek" />

      {result.ok ? (
        <PaymentsManager
          initialData={result.data}
          createManualTransactionAction={createManualTransactionAction}
        />
      ) : (
        <div className="soft-card p-5 text-sm text-red-700">{result.error}</div>
      )}
    </section>
  );
}
