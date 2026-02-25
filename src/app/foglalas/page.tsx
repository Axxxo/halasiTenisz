import { BookingGrid } from "@/components/booking/booking-grid";
import {
  createBookingAction,
  updateBookingOpponentsAction,
} from "@/server/actions/booking-actions";
import { getBookingGridData } from "@/server/booking/grid-data";

export default async function BookingPage() {
  let initialData;

  try {
    initialData = await getBookingGridData();
  } catch (error) {
    return (
      <section className="shell-container py-10">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
          Pályafoglalás
        </h1>
        <div className="mt-6 soft-card p-5 text-foreground/80">
          {(error as Error).message || "A foglalási adatok betöltése sikertelen."}
        </div>
      </section>
    );
  }

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Pályafoglalás
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Napi nézet pályánként és óránként. A csúcsidősávok kiemelve jelennek meg,
        és a saját foglalás kattintással módosítható. Pályabérlők csak az engedélyezett
        napi idősávokban indíthatnak önálló foglalást.
      </p>

      <div className="mt-6">
        <BookingGrid
          initialData={initialData}
          createBookingAction={createBookingAction}
          updateBookingOpponentsAction={updateBookingOpponentsAction}
        />
      </div>
    </section>
  );
}
