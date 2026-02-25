import { AdminNav } from "@/components/admin/admin-nav";
import { CourtsManager } from "@/components/admin/courts-manager";
import {
  createCourtAction,
  moveCourtAction,
  updateCourtAction,
} from "@/server/actions/admin-courts-actions";
import { getAdminCourtsData } from "@/server/admin/courts-data";

export default async function AdminPage() {
  const result = await getAdminCourtsData();

  return (
    <section className="shell-container space-y-5 py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Admin felület
      </h1>
      <p className="max-w-3xl text-foreground/80">
        Kezeld a pályákat, hogy a foglalási rendszerben mindig a megfelelő beosztás
        jelenjen meg.
      </p>

      <AdminNav activeHref="/admin" />

      <div>
        {result.ok ? (
          <CourtsManager
            initialCourts={result.data}
            createCourtAction={createCourtAction}
            updateCourtAction={updateCourtAction}
            moveCourtAction={moveCourtAction}
          />
        ) : (
          <div className="soft-card p-5 text-sm text-red-700">{result.error}</div>
        )}
      </div>
    </section>
  );
}
