# Halasi Tenisz Club - Web

Next.js + Supabase alapú projekt a Halasi Tenisz Club weboldal és foglalási rendszer újraépítéséhez.

## Követelmények

- Node.js 20+
- npm 10+
- Supabase projekt

## Lokális indítás

1. Környezeti változók előkészítése:

```bash
cp .env.example .env.local
```

2. Töltsd ki:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Függőségek telepítése és futtatás:

```bash
npm install
npm run dev
```

## Auth és védelem

- Belépés: `/belepes`
- Regisztráció: `/regisztracio`
- Védett route-ok: `/foglalas`, `/foglalasaim`, `/statisztika`, `/admin`
- Middleware ellenőrzi a sessiont, és vendéget belépésre irányít.

## Supabase séma és RLS

Alap migráció:

- `supabase/migrations/20260224181000_initial_schema.sql`

Tartalmazza:

- felhasználói profil kiterjesztést (`public.users`)
- foglalási és pénzügyi core táblákat
- tartalomkezelő táblákat
- RLS szabályvázat
- auth trigger-t a profil + 4 account automatikus létrehozásához

## Minőségellenőrzés

```bash
npm run lint
```
