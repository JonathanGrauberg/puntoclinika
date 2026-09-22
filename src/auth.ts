import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withUserContext } from "@/lib/tenant-context";

// Auth global (no tenant-scoped): valida contra User, que es intencionalmente
// una sola tabla para todos los centros (mismo login, varios tenants vía
// Membership). La selección del centro activo ocurre después del login,
// no acá — ver nota en prisma/migrations/20260922000001_rls.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.activo) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.nombre };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;

        // Resolver a qué centro(s) pertenece para setear el activo.
        // Simplificación de Fase 1: si tiene más de una membresía activa,
        // por ahora se auto-selecciona la primera — un selector de centro
        // explícito queda para cuando haya un caso real que lo necesite.
        const memberships = await withUserContext(user.id as string, (tx) =>
          tx.membership.findMany({
            where: { userId: user.id as string, activo: true },
            include: { tenant: true },
            orderBy: { createdAt: "asc" },
          })
        );

        const active = memberships[0];
        if (active) {
          token.tenantId = active.tenantId;
          token.tenantName = active.tenant.nombre;
          token.rol = active.rol;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.tenantName = token.tenantName as string | undefined;
        session.user.rol = token.rol as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
