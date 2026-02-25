"use server";

import { revalidatePath } from "next/cache";

import type { AdminMembersActionResult, MemberCategory } from "@/lib/admin/types";
import { listAdminMembers } from "@/server/admin/members-data";
import { requireAdminContext } from "@/server/admin/require-admin";

type UpdateUserRoleInput = {
  userId: string;
  role: "member" | "admin";
};

type UpdateMemberCategoryInput = {
  userId: string;
  memberCategory: MemberCategory;
};

type ToggleUserActiveInput = {
  userId: string;
  isActive: boolean;
};

function fail(error: string): AdminMembersActionResult {
  return {
    ok: false,
    error,
  };
}

async function success(): Promise<AdminMembersActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tagok");

  return {
    ok: true,
    data: await listAdminMembers(adminContext.supabase),
  };
}

export async function updateUserRoleAction(input: UpdateUserRoleInput): Promise<AdminMembersActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  if (!input.userId) {
    return fail("Hiányzó felhasználó azonosító.");
  }

  if (adminContext.userId === input.userId && input.role !== "admin") {
    return fail("A saját admin jogosultságod nem veheted el.");
  }

  const updateRes = await adminContext.supabase.from("users").update({ role: input.role }).eq("id", input.userId);

  if (updateRes.error) {
    return fail("A jogosultság frissítése sikertelen.");
  }

  return success();
}

export async function updateMemberCategoryAction(
  input: UpdateMemberCategoryInput,
): Promise<AdminMembersActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  if (!input.userId) {
    return fail("Hiányzó felhasználó azonosító.");
  }

  const updatePayload: {
    member_category: MemberCategory;
    is_active?: boolean;
    membership_requested?: boolean;
  } = {
    member_category: input.memberCategory,
  };

  if (input.memberCategory !== "palyaberlo") {
    updatePayload.is_active = true;
    updatePayload.membership_requested = false;
  }

  const updateRes = await adminContext.supabase
    .from("users")
    .update(updatePayload)
    .eq("id", input.userId);

  if (updateRes.error) {
    return fail("A tagsági kategória frissítése sikertelen.");
  }

  return success();
}

export async function toggleUserActiveAction(
  input: ToggleUserActiveInput,
): Promise<AdminMembersActionResult> {
  const adminContext = await requireAdminContext();

  if (!adminContext.ok) {
    return fail(adminContext.error);
  }

  const updateRes = await adminContext.supabase
    .from("users")
    .update({ is_active: input.isActive })
    .eq("id", input.userId);

  if (updateRes.error) {
    return fail("Az aktív állapot frissítése sikertelen.");
  }

  return success();
}
