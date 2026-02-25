import { AdminNav } from "@/components/admin/admin-nav";
import { MembersManager } from "@/components/admin/members-manager";
import {
  toggleUserActiveAction,
  updateMemberCategoryAction,
  updateUserRoleAction,
} from "@/server/actions/admin-members-actions";
import { getAdminMembersData } from "@/server/admin/members-data";

export default async function AdminMembersPage() {
  const result = await getAdminMembersData();

  return (
    <section className="shell-container py-10 space-y-5">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">Admin felület</h1>
      <p className="max-w-3xl text-foreground/80">Tagok, kategóriák és jogosultságok kezelése.</p>

      <AdminNav activeHref="/admin/tagok" />

      {result.ok ? (
        <MembersManager
          initialMembers={result.data}
          updateUserRoleAction={updateUserRoleAction}
          updateMemberCategoryAction={updateMemberCategoryAction}
          toggleUserActiveAction={toggleUserActiveAction}
        />
      ) : (
        <div className="soft-card p-5 text-sm text-red-700">{result.error}</div>
      )}
    </section>
  );
}
