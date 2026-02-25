import { AdminNav } from "@/components/admin/admin-nav";
import { ClosuresManager } from "@/components/admin/closures-manager";
import { createClosureAction, deleteClosureAction } from "@/server/actions/admin-closures-actions";
import { getAdminClosuresData } from "@/server/admin/closures-data";
import { getAdminCourtsData } from "@/server/admin/courts-data";

export default async function AdminClosuresPage() {
  const [closuresRes, courtsRes] = await Promise.all([getAdminClosuresData(), getAdminCourtsData()]);
  const errorMessage = !closuresRes.ok
    ? closuresRes.error
    : !courtsRes.ok
      ? courtsRes.error
      : null;

  return (
    <section className="shell-container py-10 space-y-5">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">Admin felület</h1>
      <p className="max-w-3xl text-foreground/80">Pálya zárások kezelése.</p>

      <AdminNav activeHref="/admin/zarasok" />

      {!errorMessage && closuresRes.ok && courtsRes.ok ? (
        <ClosuresManager
          initialClosures={closuresRes.data}
          courts={courtsRes.data}
          createClosureAction={createClosureAction}
          deleteClosureAction={deleteClosureAction}
        />
      ) : (
        <div className="soft-card p-5 text-sm text-red-700">{errorMessage}</div>
      )}
    </section>
  );
}
