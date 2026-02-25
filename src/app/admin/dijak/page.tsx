import { AdminNav } from "@/components/admin/admin-nav";
import { FeeSettingsForm } from "@/components/admin/fee-settings-form";
import { updateFeeSettingsAction } from "@/server/actions/admin-fee-actions";
import { getAdminFeeSettingsData } from "@/server/admin/fee-settings-data";

export default async function AdminFeeSettingsPage() {
  const result = await getAdminFeeSettingsData();

  return (
    <section className="shell-container py-10 space-y-5">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">Admin felület</h1>
      <p className="max-w-3xl text-foreground/80">Díjszabás és üzleti szabályok kezelése.</p>

      <AdminNav activeHref="/admin/dijak" />

      {result.ok ? (
        <FeeSettingsForm initialRules={result.data} updateFeeSettingsAction={updateFeeSettingsAction} />
      ) : (
        <div className="soft-card p-5 text-sm text-red-700">{result.error}</div>
      )}
    </section>
  );
}
