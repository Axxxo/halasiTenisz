"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { calculateBookingFee } from "@/lib/booking/fee-calculator";
import { isNonMemberHourAllowed } from "@/lib/booking/non-member-hours";
import type {
  ActionResult,
  BookingGridBooking,
  BookingGridData,
  GameType,
} from "@/lib/booking/types";

type DialogMode = "grid-new" | "direct" | "edit";

type FormState = {
  date: string;
  courtId: string;
  hour: number;
  gameType: GameType;
  isCoaching: boolean;
  opponentIds: string[];
  usePreviousPartnersOnly: boolean;
};

type BookingGridProps = {
  initialData: BookingGridData;
  createBookingAction: (input: {
    date: string;
    courtId: string;
    hour: number;
    timezoneOffsetMinutes: number;
    gameType: GameType;
    isCoaching: boolean;
    opponentIds: string[];
  }) => Promise<ActionResult<BookingGridBooking>>;
  updateBookingOpponentsAction: (input: {
    bookingId: string;
    gameType: GameType;
    opponentIds: string[];
  }) => Promise<ActionResult<BookingGridBooking>>;
};

const HOURS = Array.from({ length: 14 }, (_, index) => index + 7);

function requiredOpponents(gameType: GameType) {
  if (gameType === "solo") {
    return 0;
  }

  if (gameType === "singles") {
    return 1;
  }

  return 3;
}

function padHour(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function initialForm(date: string): FormState {
  return {
    date,
    courtId: "",
    hour: 17,
    gameType: "singles",
    isCoaching: false,
    opponentIds: [],
    usePreviousPartnersOnly: false,
  };
}

function formatDateLocal(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getHourLocal(iso: string) {
  return new Date(iso).getHours();
}

export function BookingGrid({
  initialData,
  createBookingAction,
  updateBookingOpponentsAction,
}: BookingGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<BookingGridBooking[]>(initialData.bookings);
  const [previousPartnerIds, setPreviousPartnerIds] = useState(initialData.previousPartnerIds);

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm(selectedDate));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const courts = useMemo(
    () => [...initialData.courts].sort((a, b) => a.sortOrder - b.sortOrder),
    [initialData.courts],
  );

  const peakHours = useMemo(() => new Set(initialData.peakHours), [initialData.peakHours]);

  const dailyBookings = useMemo(
    () => bookings.filter((booking) => formatDateLocal(booking.startsAt) === selectedDate),
    [bookings, selectedDate],
  );

  const availableMembers = useMemo(() => {
    const filteredByPartner = form.usePreviousPartnersOnly
      ? initialData.members.filter((member) => previousPartnerIds.includes(member.id))
      : initialData.members;

    const query = memberQuery.trim().toLowerCase();
    if (!query) {
      return filteredByPartner;
    }

    return filteredByPartner.filter((member) => member.name.toLowerCase().includes(query));
  }, [form.usePreviousPartnersOnly, initialData.members, memberQuery, previousPartnerIds]);

  const feePreview = useMemo(
    () =>
      calculateBookingFee({
        feeRules: initialData.feeRules,
        memberCategory: initialData.currentUser.memberCategory,
        isPeak: peakHours.has(form.hour),
        isCoaching: form.isCoaching,
        versenyzoiFreeHoursUsedThisWeek: initialData.currentUser.versenyzoiFreeHoursUsedThisWeek,
        hasLightingFee: false,
        isMufuves: false,
      }),
    [
      form.hour,
      form.isCoaching,
      initialData.currentUser.memberCategory,
      initialData.currentUser.versenyzoiFreeHoursUsedThisWeek,
      initialData.feeRules,
      peakHours,
    ],
  );

  function findBooking(courtId: string, hour: number) {
    return dailyBookings.find(
      (booking) => booking.courtId === courtId && getHourLocal(booking.startsAt) === hour,
    );
  }

  function getClosure(courtId: string, date: string, hour: number) {
    return initialData.closures.find((closure) => {
      if (closure.courtId !== courtId) {
        return false;
      }

      if (date < closure.startDate || date > closure.endDate) {
        return false;
      }

      if (closure.startHour === null || closure.endHour === null) {
        return true;
      }

      return hour >= closure.startHour && hour < closure.endHour;
    });
  }

  function isClosed(courtId: string, date: string, hour: number) {
    return Boolean(getClosure(courtId, date, hour));
  }

  function mergeBooking(updatedBooking: BookingGridBooking) {
    setBookings((prev) => {
      const existing = prev.find((booking) => booking.id === updatedBooking.id);
      if (existing) {
        return prev.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking));
      }

      return [...prev, updatedBooking];
    });

    setPreviousPartnerIds((prev) => {
      const next = new Set(prev);
      updatedBooking.opponents.forEach((opponent) => next.add(opponent.id));
      return [...next];
    });
  }

  function openGridDialog(courtId: string, hour: number) {
    setDialogMode("grid-new");
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setMemberQuery("");
    setForm({
      date: selectedDate,
      courtId,
      hour,
      gameType: "singles",
      isCoaching: false,
      opponentIds: [],
      usePreviousPartnersOnly: false,
    });
  }

  function openDirectDialog() {
    setDialogMode("direct");
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setMemberQuery("");
    setForm({
      ...initialForm(selectedDate),
      courtId: courts[0]?.id ?? "",
    });
  }

  function openEditDialog(booking: BookingGridBooking) {
    setDialogMode("edit");
    setEditingId(booking.id);
    setError(null);
    setSuccess(null);
    setMemberQuery("");
    setForm({
      date: formatDateLocal(booking.startsAt),
      courtId: booking.courtId,
      hour: getHourLocal(booking.startsAt),
      gameType: booking.gameType,
      isCoaching: booking.isCoaching,
      opponentIds: booking.opponents.map((opponent) => opponent.id),
      usePreviousPartnersOnly: false,
    });
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingId(null);
    setError(null);
  }

  function toggleOpponent(memberId: string) {
    const maxOpponents = requiredOpponents(form.gameType);
    const isSelected = form.opponentIds.includes(memberId);

    if (!isSelected && form.opponentIds.length >= maxOpponents) {
      setError(`Ehhez a játéktípushoz pontosan ${maxOpponents} ellenfél adható meg.`);
      return;
    }

    setForm((prev) => ({
      ...prev,
      opponentIds: isSelected
        ? prev.opponentIds.filter((item) => item !== memberId)
        : [...prev.opponentIds, memberId],
    }));
    setError(null);
  }

  function onGameTypeChange(gameType: GameType) {
    setForm((prev) => ({
      ...prev,
      gameType,
      opponentIds: prev.opponentIds.slice(0, requiredOpponents(gameType)),
    }));
    setError(null);
  }

  function isTaken(date: string, courtId: string, hour: number, ignoreId?: string) {
    return bookings.some(
      (booking) =>
        booking.id !== ignoreId &&
        formatDateLocal(booking.startsAt) === date &&
        booking.courtId === courtId &&
        getHourLocal(booking.startsAt) === hour,
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const expectedOpponents = requiredOpponents(form.gameType);

    if (form.opponentIds.length !== expectedOpponents) {
      setError(`A kiválasztott játéktípushoz ${expectedOpponents} ellenfél szükséges.`);
      return;
    }

    if (!form.courtId) {
      setError("Válassz pályát a foglaláshoz.");
      return;
    }

    if (dialogMode !== "edit" && initialData.currentUser.debtFt >= initialData.feeRules.debtLockoutFt) {
      setError(
        `Foglalás nem lehetséges: tartozásod eléri a ${initialData.feeRules.debtLockoutFt} Ft-ot.`,
      );
      return;
    }

    if (
      dialogMode !== "edit" &&
      initialData.currentUser.memberCategory === "palyaberlo" &&
      !isNonMemberHourAllowed(form.date, form.hour, initialData.nonMemberAllowedHours)
    ) {
      setError("Pályabérlő kategóriával ez az időpont nem foglalható az aktuális napi szabályok alapján.");
      return;
    }

    if (dialogMode !== "edit" && isClosed(form.courtId, form.date, form.hour)) {
      setError("Ez a pálya a kiválasztott időpontban zárva van.");
      return;
    }

    if (dialogMode !== "edit" && isTaken(form.date, form.courtId, form.hour)) {
      setError("Ez az időpont már foglalt. Válassz másik pályát vagy időpontot.");
      return;
    }

    if (dialogMode === "edit" && editingId) {
      startTransition(async () => {
        const result = await updateBookingOpponentsAction({
          bookingId: editingId,
          gameType: form.gameType,
          opponentIds: form.opponentIds,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        mergeBooking(result.data);
        setSuccess("Foglalás sikeresen módosítva.");
        closeDialog();
      });
      return;
    }

    startTransition(async () => {
      const result = await createBookingAction({
        date: form.date,
        courtId: form.courtId,
        hour: form.hour,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        gameType: form.gameType,
        isCoaching: form.isCoaching,
        opponentIds: form.opponentIds,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      mergeBooking(result.data);
      setSelectedDate(form.date);
      setSuccess("Foglalás rögzítve.");
      closeDialog();
    });
  }

  return (
    <section className="space-y-4">
      <div className="soft-card flex flex-wrap items-end justify-between gap-3 p-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">Pályák foglaltsága</h2>
          <p className="text-sm text-foreground/75">
            Csúcsidő: 17:00-21:00. Tartozás: {initialData.currentUser.debtFt} Ft. Tiltási limit: {" "}
            {initialData.feeRules.debtLockoutFt} Ft.
          </p>
          {initialData.currentUser.memberCategory === "palyaberlo" ? (
            <p className="text-sm font-semibold text-amber-700">
              Pályabérlő kategóriával önálló foglalás csak az engedélyezett napi idősávokban indítható.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="font-semibold text-foreground/80" htmlFor="booking-date">
            Dátum
          </label>
          <input
            id="booking-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          />
          <button
            type="button"
            onClick={openDirectDialog}
            disabled={courts.length === 0}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            Pályafoglalás
          </button>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="soft-card p-5 text-sm text-foreground/80">
          Jelenleg nincs aktív pálya beállítva a rendszerben. Amint az admin rögzíti a pályákat,
          a foglalási rács itt automatikusan megjelenik.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="rounded-lg bg-muted p-2 text-left">Idő</th>
                {courts.map((court) => (
                  <th key={court.id} className="rounded-lg bg-muted p-2 text-left">
                    {court.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="rounded-lg bg-muted px-2 py-3 font-semibold text-foreground/80">
                    {padHour(hour)}
                  </td>
                  {courts.map((court) => {
                    const courtId = court.id;
                    const booking = findBooking(courtId, hour);
                    const isPeak = peakHours.has(hour);

                    if (!booking) {
                      const closure = getClosure(courtId, selectedDate, hour);
                      const isPalyaberloBlocked =
                        initialData.currentUser.memberCategory === "palyaberlo" &&
                        !isNonMemberHourAllowed(selectedDate, hour, initialData.nonMemberAllowedHours);

                      if (closure) {
                        return (
                          <td key={`${courtId}-${hour}-closed`}>
                            <div className="flex h-16 w-full flex-col justify-center rounded-lg border border-border bg-rose-50 p-2 text-left">
                              <span className="text-xs font-semibold text-rose-700">Zárva</span>
                              <span className="text-[11px] text-rose-600/90">
                                {closure.reason ?? "Ebben az idősávban nem foglalható."}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${courtId}-${hour}`}>
                          <button
                            type="button"
                            onClick={() => openGridDialog(courtId, hour)}
                            disabled={isPalyaberloBlocked}
                            className={`h-16 w-full rounded-lg border border-dashed border-border p-2 text-left transition-colors hover:border-primary ${
                              isPalyaberloBlocked
                                ? "cursor-not-allowed bg-amber-100/70 text-amber-800"
                                : isPeak
                                  ? "bg-[#e4e9dd]"
                                  : "bg-white"
                            }`}
                          >
                            <span className="text-xs text-foreground/60">
                              {isPalyaberloBlocked ? "Nem foglalható" : "Szabad"}
                            </span>
                          </button>
                        </td>
                      );
                    }

                    const isOwnBooking = booking.bookerId === initialData.currentUser.id;

                    return (
                      <td key={booking.id}>
                        <button
                          type="button"
                          onClick={() => isOwnBooking && openEditDialog(booking)}
                          className={`h-16 w-full rounded-lg border border-border p-2 text-left ${
                            isOwnBooking
                              ? "bg-primary/10 transition-colors hover:bg-primary/20"
                              : "cursor-not-allowed bg-amber-50"
                          }`}
                        >
                          <p className="font-semibold text-foreground">{booking.bookerName}</p>
                          <p className="text-xs text-foreground/65">
                            {booking.opponents.length > 0
                              ? `Ellenfél(ek): ${booking.opponents.map((opponent) => opponent.name).join(", ")}`
                              : "Solo játék"}
                          </p>
                          {booking.isCoaching ? (
                            <p className="text-[11px] font-semibold text-primary-strong">Oktatás</p>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {success ? <p className="text-sm font-semibold text-primary-strong">{success}</p> : null}

      {dialogMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-[family-name:var(--font-heading)] text-3xl text-primary-strong">
              {dialogMode === "edit" ? "Foglalás módosítása" : "Pályafoglalás"}
            </h3>

            <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-foreground/80">Dátum</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                    disabled={dialogMode === "grid-new" || dialogMode === "edit"}
                    className="rounded-lg border border-border bg-white px-3 py-2 disabled:bg-muted"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-foreground/80">Pálya</span>
                  <select
                    value={form.courtId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, courtId: event.target.value }))
                    }
                    disabled={dialogMode === "grid-new" || dialogMode === "edit"}
                    className="rounded-lg border border-border bg-white px-3 py-2 disabled:bg-muted"
                  >
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-foreground/80">Idő</span>
                  <select
                    value={form.hour}
                    onChange={(event) => setForm((prev) => ({ ...prev, hour: Number(event.target.value) }))}
                    disabled={dialogMode === "grid-new" || dialogMode === "edit"}
                    className="rounded-lg border border-border bg-white px-3 py-2 disabled:bg-muted"
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {padHour(hour)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-foreground/80">Játéktípus</span>
                <select
                  value={form.gameType}
                  onChange={(event) => onGameTypeChange(event.target.value as GameType)}
                  disabled={dialogMode === "edit"}
                  className="rounded-lg border border-border bg-white px-3 py-2"
                >
                  <option value="solo">Solo (0 ellenfél)</option>
                  <option value="singles">Singles (1 ellenfél)</option>
                  <option value="doubles">Doubles (3 ellenfél)</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <input
                  type="checkbox"
                  checked={form.isCoaching}
                  onChange={(event) => setForm((prev) => ({ ...prev, isCoaching: event.target.checked }))}
                  disabled={dialogMode === "edit"}
                />
                Oktatás (egységes coaching díj)
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <input
                  type="checkbox"
                  checked={form.usePreviousPartnersOnly}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      usePreviousPartnersOnly: event.target.checked,
                      opponentIds: prev.opponentIds.filter((id) =>
                        event.target.checked ? previousPartnerIds.includes(id) : true,
                      ),
                    }))
                  }
                />
                Csak korábbi játékostársak mutatása
              </label>

              <div className="rounded-xl border border-border bg-muted/50 p-3">
                <p className="text-sm font-semibold text-foreground/80">Ellenfelek kiválasztása</p>
                <input
                  type="search"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Keresés név alapján..."
                  className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring"
                />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {availableMembers.map((member) => {
                    const checked = form.opponentIds.includes(member.id);
                    return (
                      <label key={member.id} className="flex items-center gap-2 text-sm text-foreground/85">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOpponent(member.id)}
                        />
                        {member.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}

              {dialogMode !== "edit" ? (
                <p className="text-sm font-semibold text-foreground/80">
                  Várható díj: {feePreview.totalFeeFt} Ft
                  {feePreview.totalFeeFt === 0
                    ? " (kedvezményes/ingyenes óra)"
                    : form.isCoaching
                      ? " (oktatási díj)"
                      : ""}
                </p>
              ) : null}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground/80 transition-colors hover:bg-muted"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong"
                >
                  {isPending ? "Mentés..." : dialogMode === "edit" ? "Mentés" : "Foglalás rögzítése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
