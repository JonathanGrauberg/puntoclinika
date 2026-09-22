import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId?: string;
      tenantName?: string;
      rol?: string;
    } & DefaultSession["user"];
  }
}
