import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KioscoCheckin } from "@/components/kiosco/kiosco-checkin";

export default async function KioscoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { nombre: true, activo: true } });

  if (!tenant || !tenant.activo) notFound();

  return <KioscoCheckin slug={slug} tenantNombre={tenant.nombre} />;
}
