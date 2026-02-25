import { MyBookingsList } from "@/components/booking/my-bookings-list";
import { cancelBookingsAction } from "@/server/actions/my-bookings-actions";
import { getMyBookingsData } from "@/server/booking/my-bookings-data";

export default async function MyBookingsPage() {
  let data;

  try {
    data = await getMyBookingsData();
  } catch (error) {
    return (
      <section className="shell-container py-10">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
          Foglalásaim
        </h1>
        <div className="mt-6 soft-card p-5 text-foreground/80">
          {(error as Error).message || "A foglalások betöltése sikertelen."}
        </div>
      </section>
    );
  }

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Foglalásaim
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Itt láthatod a közelgő foglalásaidat. Több tételt is kijelölhetsz egyszerre
        lemondásra, a rendszer pedig jelzi, ha a {data.lateCancelMinutes} perces határidőn túl
        jársz.
      </p>

      <div className="mt-6">
        <MyBookingsList
          initialItems={data.items}
          lateCancelMinutes={data.lateCancelMinutes}
          cancelBookingsAction={cancelBookingsAction}
        />
      </div>
    </section>
  );
}
