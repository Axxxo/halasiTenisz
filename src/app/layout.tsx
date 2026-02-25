import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";

import siteLogo from "@/images/newlogohalas1.png";
import type { MemberCategory } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/server/actions/auth-actions";

import "./globals.css";

const headingFont = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

const infoNavItems = [
  { href: "/", label: "Főoldal" },
  { href: "/palyahasznalat#dijszabas", label: "Árak" },
  { href: "/alapszabaly", label: "Alapszabály" },
  { href: "/palyahasznalat", label: "Pályahasználat" },
  { href: "/versenyek", label: "Versenyek" },
  { href: "/galeria", label: "Galéria" },
  { href: "/etikai-kodex", label: "Etikai kódex" },
  { href: "/kapcsolat", label: "Kapcsolat" },
];

const bookingNavItems = [
  { href: "/foglalas", label: "Pályafoglalás" },
  { href: "/foglalasaim", label: "Foglalásaim" },
  { href: "/statisztika", label: "Statisztika" },
];

export const metadata: Metadata = {
  title: "Halasi Tenisz Klub",
  description: "Halasi Tenisz Klub hivatalos oldala és pályafoglalási felülete.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    full_name: string | null;
    role: "member" | "admin";
    is_active: boolean;
    member_category: MemberCategory | null;
  } | null = null;

  if (user) {
    const profileRes = await supabase
      .from("users")
      .select("full_name, role, is_active, member_category")
      .eq("id", user.id)
      .maybeSingle();

    profile = (profileRes.data as {
      full_name: string | null;
      role: "member" | "admin";
      is_active: boolean;
      member_category: MemberCategory | null;
    } | null) ?? null;
  }

  const isSignedIn = Boolean(user);
  const isAdmin = profile?.role === "admin";
  const displayName = profile?.full_name?.trim() || user?.email || "Tag";
  const welcomeRoleLabel =
    profile?.member_category === "palyaberlo"
      ? "Pályabérlő · foglalás az engedélyezett idősávokban"
      : "Klubtag";

  return (
    <html lang="hu">
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>
        <header className="border-b border-border bg-surface/95">
          <div className="shell-container py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src={siteLogo}
                  alt="Halasi Tenisz Klub logó"
                  className="h-[4.5rem] w-[4.5rem] rounded-full border border-border object-cover"
                  priority
                />
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-2xl leading-none tracking-wide text-primary">
                    Halasi Tenisz Klub
                  </p>
                  <p className="text-sm text-foreground/70">Kiskunhalas · 1987 óta</p>
                </div>
              </Link>

              {isSignedIn ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <p className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground/80">
                    Bejelentkezve: {displayName}
                  </p>
                  <p className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {welcomeRoleLabel}
                  </p>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted"
                    >
                      Kilépés
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Link
                    href="/belepes"
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted"
                  >
                    Belépés
                  </Link>
                  <Link
                    href="/regisztracio"
                    className="rounded-lg bg-primary px-3 py-1.5 text-white transition-colors hover:bg-primary-strong"
                  >
                    Regisztráció
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {infoNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/70 hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}

              {isSignedIn ? (
                <>
                  <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                  {bookingNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              ) : null}

              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-full bg-accent/15 px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-12 border-t border-border bg-surface">
          <div className="shell-container py-6 text-sm text-foreground/70">
            © {new Date().getFullYear()} Halasi Tenisz Klub · Minden jog fenntartva.
          </div>
        </footer>
      </body>
    </html>
  );
}
