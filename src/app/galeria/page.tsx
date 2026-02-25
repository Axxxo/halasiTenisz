export default function GalleryPage() {
  const albums = [
    { title: "Klubélet", description: "Hétvégi játékok, közösségi események", photos: 24 },
    { title: "Versenyhangulat", description: "Liga és kupa pillanatok", photos: 18 },
    { title: "Utánpótlás", description: "Fiatal játékosok edzései és tornái", photos: 12 },
  ];

  return (
    <section className="shell-container py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-primary-strong">
        Galéria
      </h1>
      <p className="mt-3 max-w-3xl text-foreground/80">
        Albumok és lightbox nézet. A képek Supabase Storage-ból töltődnek majd,
        albumonként rendezve.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {albums.map((album) => (
          <article key={album.title} className="soft-card overflow-hidden">
            <div className="h-28 bg-[linear-gradient(130deg,#d5e4cd_0%,#edf4e8_40%,#f4eee7_100%)]" />
            <div className="p-4">
              <h2 className="text-lg font-semibold text-primary">{album.title}</h2>
              <p className="mt-1 text-sm text-foreground/75">{album.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary/80">
                {album.photos} fotó
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 soft-card p-5 text-foreground/75">
        Következő lépés: teljes albumoldal + lightbox megnyitás, admin feltöltéssel.
      </div>
    </section>
  );
}
