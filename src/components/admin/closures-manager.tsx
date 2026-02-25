"use client";

import { FormEvent, useState, useTransition } from "react";

import type { AdminClosuresActionResult, AdminCourt, CourtClosureItem } from "@/lib/admin/types";

type ClosuresManagerProps = {
  initialClosures: CourtClosureItem[];
  courts: AdminCourt[];
  createClosureAction: (input: {
    courtId: string;
    startDate: string;
    endDate: string;
    startHour: number | null;
    endHour: number | null;
    reason: string;
  }) => Promise<AdminClosuresActionResult>;
  deleteClosureAction: (input: { closureId: string }) => Promise<AdminClosuresActionResult>;
};

const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);

function padHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function formatHourRange(startHour: number | null, endHour: number | null) {
  if (startHour === null || endHour === null) {
    return "Egész nap";
  }

  return `${padHour(startHour)} - ${padHour(endHour)}`;
}

export function ClosuresManager({
  initialClosures,
  courts,
  createClosureAction,
  deleteClosureAction,
}: ClosuresManagerProps) {
  const [closures, setClosures] = useState(initialClosures);
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isFullDay, setIsFullDay] = useState(true);
  const [startHour, setStartHour] = useState(17);
  const [endHour, setEndHour] = useState(18);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyResult(result: AdminClosuresActionResult, successText: string) {
    if (!result.ok) {
      setError(result.error);
      setSuccess(null);
      return;
    }

    setClosures(result.data);
    setError(null);
    setSuccess(successText);
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createClosureAction({
        courtId,
        startDate,
        endDate,
        startHour: isFullDay ? null : startHour,
        endHour: isFullDay ? null : endHour,
        reason,
      });

      applyResult(result, "Pályazárás rögzítve.");
      if (result.ok) {
        setReason("");
      }
    });
  }

  function onDelete(closureId: string) {
    startTransition(async () => {
      const result = await deleteClosureAction({ closureId });
      applyResult(result, "Pályazárás törölve.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="soft-card p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-primary-strong">
          Pálya zárások
        </h2>
        <p className="mt-2 text-sm text-foreground/75">
          Itt tudod jelezni, ha egy pálya dátumtartományban és opcionálisan adott órákban nem foglalható.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-6" onSubmit={onCreate}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Pálya</span>
            <select
              value={courtId}
              onChange={(event) => setCourtId(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Kezdő dátum</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Záró dátum</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(event) => setIsFullDay(event.target.checked)}
            />
            Egész napos zárás
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Kezdő óra</span>
            <select
              value={startHour}
              onChange={(event) => {
                const nextStartHour = Number(event.target.value);
                setStartHour(nextStartHour);
                setEndHour((currentEndHour) =>
                  currentEndHour <= nextStartHour ? Math.min(21, nextStartHour + 1) : currentEndHour,
                );
              }}
              disabled={isFullDay}
              className="rounded-lg border border-border bg-white px-3 py-2 disabled:bg-muted"
            >
              {HOURS.filter((hour) => hour < 21).map((hour) => (
                <option key={hour} value={hour}>
                  {padHour(hour)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground/80">Záró óra</span>
            <select
              value={endHour}
              onChange={(event) => {
                const nextEndHour = Number(event.target.value);
                setEndHour(nextEndHour);
                setStartHour((currentStartHour) =>
                  currentStartHour >= nextEndHour ? Math.max(7, nextEndHour - 1) : currentStartHour,
                );
              }}
              disabled={isFullDay}
              className="rounded-lg border border-border bg-white px-3 py-2 disabled:bg-muted"
            >
              {HOURS.filter((hour) => hour > 7).map((hour) => (
                <option key={hour} value={hour}>
                  {padHour(hour)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-6">
            <span className="font-semibold text-foreground/80">Megjegyzés (opcionális)</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Pl. karbantartás"
              className="rounded-lg border border-border bg-white px-3 py-2"
            />
          </label>

          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              disabled={isPending || courts.length === 0}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {isPending ? "Mentés..." : "Zárás rögzítése"}
            </button>
          </div>
        </form>
      </div>

      {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="soft-card p-4">
        <h3 className="font-semibold text-foreground">Aktív zárások</h3>
        {closures.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Nincs rögzített pályazárás.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {closures.map((closure) => (
              <li
                key={closure.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {closure.courtName} · {closure.startDate}
                    {closure.endDate !== closure.startDate ? ` - ${closure.endDate}` : ""}
                  </p>
                  <p className="text-foreground/70">{formatHourRange(closure.startHour, closure.endHour)}</p>
                  <p className="text-foreground/70">{closure.reason ?? "Nincs megjegyzés"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(closure.id)}
                  disabled={isPending}
                  className="rounded-lg border border-border px-3 py-1 font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Törlés
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
