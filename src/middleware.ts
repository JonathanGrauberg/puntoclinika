import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  runtime: "nodejs",
  // /portal tiene su propia sesión y su propio guard (requireSesionPortal),
  // completamente separados de la sesión de staff — no debe pasar por acá.
  // /kiosco es público (pantalla en sala de espera, sin login de ningún tipo).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|portal|kiosco).*)"],
};
