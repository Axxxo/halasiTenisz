"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import type { AdminCourt, AdminCourtsActionResult } from "@/lib/admin/types";

type CourtsManagerProps = {
  initialCourts: AdminCourt[];
  createCourtAction: (input: {
    name: string;
    isActive: boolean;
  }) => Promise<AdminCourtsActionResult>;
  updateCourtAction: (input: {
    courtId: string;
    name: string;
    isActive: boolean;
  }) => Promise<AdminCourtsActionResult>;
  moveCourtAction: (input: {
    courtId: string;
    direction: "up" | "down";
  }) => Promise<AdminCourtsActionResult>;
};

type DraftById = Record<
  string,
  {
    name: string;
    isActive: boolean;
  }
>;

function buildDrafts(courts: AdminCourt[]): DraftById {
  return Object.fromEntries(
    courts.map((court) => [
      court.id,
      {
        name: court.name,
        isActive: court.isActive,
      },
    ]),
  );
}

function sortCourts(courts: AdminCourt[]) {
  return [...courts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function CourtsManager({
  initialCourts,
  createCourtAction,
  updateCourtAction,
  moveCourtAction,
}: CourtsManagerProps) {
  const [courts, setCourts] = useState<AdminCourt[]>(sortCourts(initialCourts));
  const [drafts, setDrafts] = useState<DraftById>(buildDrafts(initialCourts));
  const [newName, setNewName] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderedCourts = useMemo(() => sortCourts(courts), [courts]);

  function applyResult(result: AdminCourtsActionResult, successText: string) {
    if (!result.ok) {
      setError(result.error);
      setFeedback(null);
      return;
    }

    const sorted = sortCourts(result.data);
    setCourts(sorted);
    setDrafts(buildDrafts(sorted));
    setError(null);
    setFeedback(successText);
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();

    if (!name) {
      setError("Adj meg pályanevet.");
      setFeedback(null);
      return;
    }

    startTransition(async () => {
      const result = await createCourtAction({
        name,
        isActive: newIsActive,
      });

      applyResult(result, "Új pálya létrehozva.");

      if (result.ok) {
        setNewName("");
        setNewIsActive(true);
      }
    });
  }

  function onSaveCourt(courtId: string) {
    const draft = drafts[courtId];
    if (!draft) {
      return;
    }

    startTransition(async () => {
      const result = await updateCourtAction({
        courtId,
        name: draft.name,
        isActive: draft.isActive,
      });

      applyResult(result, "Pálya adatai frissítve.");
    });
  }

  function onMove(courtId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveCourtAction({
        courtId,
        direction,
      });

      applyResult(result, "Pálya sorrend frissítve.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="soft-card p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-primary-strong">
          Pályák beállítása
        </h2>
        <p className="mt-2 text-sm text-foreground/75">
          Itt tudod kezelni a foglalási rácsban megjelenő pályákat.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onCreateSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Pálya neve</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Pl. 4-es pálya"
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <label className="flex items-end gap-2 text-sm font-semibold text-foreground/80">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(event) => setNewIsActive(event.target.checked)}
            />
            Aktív
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-70"
            >
              {isPending ? "Mentés..." : "Pálya hozzáadása"}
            </button>
          </div>
        </form>
      </div>

      {feedback ? <p className="text-sm font-semibold text-primary-strong">{feedback}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto soft-card p-4">
        <table className="min-w-[760px] w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr>
              <th className="text-left">Sorrend</th>
              <th className="text-left">Név</th>
              <th className="text-left">Állapot</th>
              <th className="text-left">Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {orderedCourts.map((court, index) => {
              const draft = drafts[court.id] ?? {
                name: court.name,
                isActive: court.isActive,
              };

              return (
                <tr key={court.id} className="rounded-lg bg-muted/40">
                  <td className="px-2 py-2 font-semibold text-foreground/80">{index + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [court.id]: {
                            ...draft,
                            name: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <label className="flex items-center gap-2 font-semibold text-foreground/80">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [court.id]: {
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onMove(court.id, "up")}
                        disabled={isPending || index === 0}
                        className="rounded-lg border border-border px-2 py-1 font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        Fel
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(court.id, "down")}
                        disabled={isPending || index === orderedCourts.length - 1}
                        className="rounded-lg border border-border px-2 py-1 font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        Le
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveCourt(court.id)}
                        disabled={isPending}
                        className="rounded-lg bg-primary px-3 py-1 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-70"
                      >
                        Mentés
                      </button>
                    </div>
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
