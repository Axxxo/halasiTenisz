"use client";

import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [membershipRequested, setMembershipRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSupabaseEnv()) {
      setError("Supabase környezeti változók hiányoznak.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          membership_requested: membershipRequested,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess(
      "Regisztráció sikeres. Pályabérlőként azonnal foglalhatsz az engedélyezett idősávokban, tagsághoz admin jóváhagyás szükséges.",
    );
    setIsSubmitting(false);
    setPassword("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-semibold text-foreground/80">Név</span>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="Teljes név"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
        <input
          type="checkbox"
          checked={membershipRequested}
          onChange={(event) => setMembershipRequested(event.target.checked)}
        />
        Klubtag szeretnék lenni vagy már az vagyok (admin jóváhagyással)
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold text-foreground/80">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="nev@pelda.hu"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold text-foreground/80">Jelszó</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          className="rounded-lg border border-border bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="Legalább 8 karakter"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? <p className="text-sm text-primary-strong">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Regisztráció..." : "Regisztráció"}
      </button>
    </form>
  );
}
