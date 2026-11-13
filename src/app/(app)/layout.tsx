import { Shell } from "@/components/app-shell/shell";
import { requireSessionWithModules } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AvisoEmail } from "@/components/app-shell/aviso-email";
import { CuentaSuspendida } from "@/components/app-shell/cuenta-suspendida";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionWithModules();
  const [usuario, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { emailVerificadoEn: true, esDueno: true } }),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { activo: true } }),
  ]);

  // Cuenta suspendida por el dueño de la plataforma: se ve el aviso en lugar de la app.
  if (tenant && !tenant.activo && !usuario?.esDueno) {
    return <CuentaSuspendida centro={session.tenantName} />;
  }

  // Los centros médicos existentes ya están verificados: el aviso es solo para cuentas nuevas.
  const emailSinVerificar = session.tenantTipo !== "MEDICO" && !usuario?.emailVerificadoEn;

  return (
    <Shell
      tenantName={session.tenantName}
      userName={session.userName}
      rol={session.rol}
      enabledModules={session.enabledModules}
      esDueno={Boolean(usuario?.esDueno)}
    >
      {emailSinVerificar && <AvisoEmail />}
      {children}
    </Shell>
  );
}
