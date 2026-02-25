import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

const MEMBER_PATH_PREFIXES = ["/foglalas", "/foglalasaim", "/statisztika", "/admin"];
const ADMIN_PATH_PREFIX = "/admin";

function isProtectedPath(pathname: string) {
  return MEMBER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseEnv()) {
    return response;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/belepes", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname === ADMIN_PATH_PREFIX || request.nextUrl.pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)) {
    const { data: roleData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return NextResponse.redirect(new URL("/foglalas", request.url));
    }
  }

  return response;
}
