export default function ContactPage() {
  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Kapcsolat
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="soft-card p-5">
          <h2 className="text-lg font-semibold">Halasi Tenisz Klub</h2>
          <p className="mt-2 text-foreground/80">Kiskunhalas, Magyarország</p>
          <p className="text-foreground/80">E-mail: kapcsolat@halasitenisz.hu</p>
          <p className="text-foreground/80">Telefon: +36 30 000 0000</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <iframe
              title="Halasi Tenisz Klub térkép"
              src="https://www.google.com/maps?q=Kiskunhalas&output=embed"
              className="h-56 w-full"
              loading="lazy"
            />
          </div>
        </article>

        <article className="soft-card p-5">
          <h2 className="text-lg font-semibold">Üzenetküldés</h2>
          <form className="mt-3 grid gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-foreground/80">Név</span>
              <input
                type="text"
                placeholder="Teljes név"
                className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-foreground/80">E-mail</span>
              <input
                type="email"
                placeholder="nev@pelda.hu"
                className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-foreground/80">Üzenet</span>
              <textarea
                rows={4}
                placeholder="Írd le röviden, miben segíthetünk..."
                className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              />
            </label>

            <button
              type="button"
              className="mt-1 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong"
            >
              Üzenet küldése
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
