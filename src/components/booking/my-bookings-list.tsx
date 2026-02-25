"use client";

import { useMemo, useState, useTransition } from "react";

import type { ActionResult, CancelBookingsResult, MyBookingItem } from "@/lib/booking/types";

type MyBookingsListProps = {
  initialItems: MyBookingItem[];
  lateCancelMinutes: number;
  cancelBookingsAction: (input: {
    bookingIds: string[];
  }) => Promise<ActionResult<CancelBookingsResult>>;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const GAME_TYPE_LABELS = {
  solo: "Solo",
  singles: "Singles",
  doubles: "Doubles",
} as const;

export function MyBookingsList({
  initialItems,
  lateCancelMinutes,
  cancelBookingsAction,
}: MyBookingsListProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedLateCount = useMemo(
    () => items.filter((item) => selectedSet.has(item.id) && item.isLateCancellation).length,
    [items, selectedSet],
  );

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
      return;
    }

    setSelectedIds([]);
  }

  function cancelSelected() {
    if (selectedIds.length === 0) {
      setError("Válassz legalább egy foglalást.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await cancelBookingsAction({
        bookingIds: selectedIds,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const cancelledSet = new Set(result.data.cancelledIds);
      setItems((prev) => prev.filter((item) => !cancelledSet.has(item.id)));
      setSelectedIds([]);

      const lateCount = result.data.lateCancelledIds.length;
      if (lateCount > 0) {
        setSuccess(
          `${result.data.cancelledIds.length} foglalás lemondva. ${lateCount} lemondás határidőn túl történt, díjterhelés várható.`,
        );
        return;
      }

      setSuccess(`${result.data.cancelledIds.length} foglalás sikeresen lemondva.`);
    });
  }

  if (items.length === 0) {
    return (
      <div className="soft-card p-5 text-foreground/80">
        Nincs közelgő foglalásod.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="soft-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <input
              type="checkbox"
              checked={selectedIds.length === items.length && items.length > 0}
              onChange={(event) => toggleSelectAll(event.target.checked)}
            />
            Összes kijelölése
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={cancelSelected}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Lemondás..." : "Kijelöltek lemondása"}
          </button>
        </div>

        {selectedLateCount > 0 ? (
          <p className="mt-3 text-sm font-semibold text-amber-700">
            Figyelem: {selectedLateCount} kijelölt foglalás {lateCancelMinutes} percen belüli
            lemondásnak minősül, a díj terhelése megtörténik.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="soft-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground/85">
                <input
                  type="checkbox"
                  checked={selectedSet.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                />
                Kijelölés
              </label>

              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  item.isLateCancellation
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {item.isLateCancellation ? "Díjköteles lemondás" : "Díjmentes lemondás"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-foreground/85 md:grid-cols-2">
              <p>
                <span className="font-semibold">Pálya:</span> {item.courtName}
              </p>
              <p>
                <span className="font-semibold">Kezdés:</span> {formatDateTime(item.startsAt)}
              </p>
              <p>
                <span className="font-semibold">Lemondási határidő:</span>{" "}
                {formatDateTime(item.cancellationDeadline)}
              </p>
              <p>
                <span className="font-semibold">Játéktípus:</span> {GAME_TYPE_LABELS[item.gameType]}
              </p>
            </div>

            <p className="mt-2 text-sm text-foreground/80">
              <span className="font-semibold">Ellenfelek:</span>{" "}
              {item.opponents.length > 0 ? item.opponents.join(", ") : "Solo játék"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
