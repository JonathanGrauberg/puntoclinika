import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/logo-negro.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="h-7 w-auto dark:hidden"
          />
          <Image
            src="/brand/logo-blanco.png"
            alt=".clinika"
            width={930}
            height={230}
            priority
            className="hidden h-7 w-auto dark:block"
          />
        </div>
        <ResetPasswordForm token={token ?? ""} />
      </div>
    </div>
  );
}
