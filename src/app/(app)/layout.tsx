import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionWithModules();

  return (
    <Shell
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      {children}
    </Shell>
  );
}
