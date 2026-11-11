import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AvisoEmail } from "@/components/app-shell/aviso-email";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionWithModules();
  // Los centros médicos existentes ya están verificados: solo se consulta en cuentas nuevas.
  const emailSinVerificar =
    session.tenantTipo !== "MEDICO" &&
    !(await prisma.user.findUnique({ where: { id: session.userId }, select: { emailVerificadoEn: true } }))
      ?.emailVerificadoEn;

  return (
    <Shell
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
    >
      {emailSinVerificar && <AvisoEmail />}
      {children}
    </Shell>
  );
}
