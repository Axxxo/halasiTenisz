"use client";

import { useState, useTransition } from "react";

import type { AdminMemberItem, AdminMembersActionResult, MemberCategory } from "@/lib/admin/types";

type MembersManagerProps = {
  initialMembers: AdminMemberItem[];
  updateUserRoleAction: (input: {
    userId: string;
    role: "member" | "admin";
  }) => Promise<AdminMembersActionResult>;
  updateMemberCategoryAction: (input: {
    userId: string;
    memberCategory: MemberCategory;
  }) => Promise<AdminMembersActionResult>;
  toggleUserActiveAction: (input: {
    userId: string;
    isActive: boolean;
  }) => Promise<AdminMembersActionResult>;
};

type MemberDraft = {
  role: "member" | "admin";
  memberCategory: MemberCategory;
  isActive: boolean;
};

type DraftMap = Record<string, MemberDraft>;

function toDrafts(members: AdminMemberItem[]): DraftMap {
  return Object.fromEntries(
    members.map((member) => [
      member.id,
      {
        role: member.role,
        memberCategory: member.memberCategory,
        isActive: member.isActive,
      },
    ]),
  );
}

export function MembersManager({
  initialMembers,
  updateUserRoleAction,
  updateMemberCategoryAction,
  toggleUserActiveAction,
}: MembersManagerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [drafts, setDrafts] = useState<DraftMap>(toDrafts(initialMembers));
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingCount = members.filter(
    (member) => member.membershipRequested && member.memberCategory === "palyaberlo",
  ).length;

  const displayedMembers = showPendingOnly
    ? members.filter((member) => member.membershipRequested && member.memberCategory === "palyaberlo")
    : members;

  function applyResult(result: AdminMembersActionResult, successText: string) {
    if (!result.ok) {
      setError(result.error);
      setSuccess(null);
      return;
    }

    setMembers(result.data);
    setDrafts(toDrafts(result.data));
    setError(null);
    setSuccess(successText);
  }

  function saveMember(userId: string) {
    const draft = drafts[userId];
    const member = members.find((item) => item.id === userId);

    if (!draft || !member) {
      return;
    }

    startTransition(async () => {
      let current = member;
      let lastResult: AdminMembersActionResult | null = null;

      if (draft.role !== current.role) {
        const roleResult = await updateUserRoleAction({
          userId,
          role: draft.role,
        });

        if (!roleResult.ok) {
          applyResult(roleResult, "");
          return;
        }

        current = roleResult.data.find((item) => item.id === userId) ?? current;
        lastResult = roleResult;
      }

      if (draft.memberCategory !== current.memberCategory) {
        const categoryResult = await updateMemberCategoryAction({
          userId,
          memberCategory: draft.memberCategory,
        });

        if (!categoryResult.ok) {
          applyResult(categoryResult, "");
          return;
        }

        current = categoryResult.data.find((item) => item.id === userId) ?? current;
        lastResult = categoryResult;
      }

      if (draft.isActive !== current.isActive) {
        const activeResult = await toggleUserActiveAction({
          userId,
          isActive: draft.isActive,
        });

        if (!activeResult.ok) {
          applyResult(activeResult, "");
          return;
        }

        current = activeResult.data.find((item) => item.id === userId) ?? current;
        lastResult = activeResult;
      }

      if (!lastResult) {
        setError(null);
        setSuccess("Nincs mentendő módosítás.");
        return;
      }

      applyResult(lastResult, "Változások mentve.");
    });
  }

  return (
    <div className="space-y-4">
      {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
          Függő tagsági kérések: {pendingCount}
        </span>
        <label className="flex items-center gap-2 font-semibold text-foreground/80">
          <input
            type="checkbox"
            checked={showPendingOnly}
            onChange={(event) => setShowPendingOnly(event.target.checked)}
          />
          Csak függőben lévő kérések
        </label>
      </div>

      <div className="overflow-x-auto soft-card p-4">
        <table className="min-w-[980px] w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr>
              <th className="text-left">Tag</th>
              <th className="text-left">E-mail</th>
              <th className="text-left">Egyenleg</th>
              <th className="text-left">Jogkör</th>
              <th className="text-left">Kategória</th>
              <th className="text-left">Aktív</th>
              <th className="text-left">Mentés</th>
            </tr>
          </thead>
          <tbody>
            {displayedMembers.map((member) => {
              const draft = drafts[member.id] ?? {
                role: member.role,
                memberCategory: member.memberCategory,
                isActive: member.isActive,
              };

              const isMembershipPending =
                member.membershipRequested && member.memberCategory === "palyaberlo";

              return (
                <tr key={member.id} className="rounded-lg bg-muted/40">
                  <td className="px-2 py-2 font-semibold text-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{member.fullName}</span>
                      {isMembershipPending ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Tagság kérve
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-foreground/80">{member.email}</td>
                  <td className="px-2 py-2 text-foreground/80">
                    {member.balanceFt} Ft{member.debtFt > 0 ? ` (tartozás: ${member.debtFt} Ft)` : ""}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={draft.role}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member.id]: {
                            ...draft,
                            role: event.target.value as "member" | "admin",
                          },
                        }))
                      }
                      className="rounded-lg border border-border bg-white px-3 py-2"
                    >
                      <option value="member">Tag</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={draft.memberCategory}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member.id]: {
                            ...draft,
                            memberCategory: event.target.value as MemberCategory,
                          },
                        }))
                      }
                      className="rounded-lg border border-border bg-white px-3 py-2"
                    >
                      <option value="normal">Klub tag</option>
                      <option value="diak">Diák</option>
                      <option value="versenyzoi">Versenyző</option>
                      <option value="palyaberlo">Pályabérlő (nem tag)</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <label className="flex items-center gap-2 font-semibold text-foreground/80">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [member.id]: {
                              ...draft,
                              isActive: event.target.checked,
                            },
                          }))
                        }
                      />
                      {draft.isActive ? "Aktív" : "Inaktív"}
                    </label>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => saveMember(member.id)}
                      disabled={isPending}
                      className="rounded-lg bg-primary px-3 py-1 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
                    >
                      Mentés
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
