import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/foglalas";

  return (
    <section className="shell-container py-10">
      <div className="mx-auto max-w-md soft-card p-6">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl text-primary-strong">
          Belépés
        </h1>
        <p className="mt-2 text-foreground/75">Tagi hozzáféréshez jelentkezz be.</p>

        <LoginForm nextPath={nextPath} />

        <div className="mt-5 flex flex-col gap-3 text-sm">
          <Link
            href="/regisztracio"
            className="rounded-lg border border-border px-4 py-2 text-center font-semibold text-primary transition-colors hover:bg-muted"
          >
            Nincs fiókod? Regisztráció
          </Link>
        </div>
      </div>
    </section>
  );
}
