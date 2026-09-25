import "server-only";
import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM ?? ".clinika <soporte@webistudio.net>";

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY no está configurada — no se envía el email.");
    return null;
  }
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function emailShell(bodyHtml: string): string {
  return `
  <div style="font-family: Arial, sans-serif; background:#F4F5F7; padding:32px 16px;">
    <div style="max-width:480px; margin:0 auto; background:#FFFFFF; border-radius:12px; padding:32px 28px; border:1px solid #E7E8EC;">
      <div style="font-size:18px; font-weight:800; color:#15171C; letter-spacing:-0.3px; margin-bottom:20px;">.clinika</div>
      ${bodyHtml}
      <p style="font-size:11px; color:#9297A2; margin-top:28px; line-height:1.6;">
        Este es un email automático de .clinika by Webi. Studio Digital. Si no reconocés esta actividad, podés ignorarlo con tranquilidad.
      </p>
    </div>
  </div>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const client = getResendClient();
  if (!client) return;

  const html = emailShell(`
    <h1 style="font-size:16px; color:#15171C; margin:0 0 12px;">Restablecer tu contraseña</h1>
    <p style="font-size:13.5px; color:#4B4F57; line-height:1.7; margin:0 0 20px;">
      Pediste restablecer la contraseña de tu cuenta en <b>.clinika</b>. Este link es válido por
      <b>1 hora</b> y solo se puede usar una vez.
    </p>
    <a href="${resetUrl}"
      style="display:inline-block; background:#15171C; color:#FFFFFF; text-decoration:none; font-size:13.5px; font-weight:600; padding:11px 22px; border-radius:8px;">
      Elegir nueva contraseña
    </a>
    <p style="font-size:12px; color:#9297A2; line-height:1.7; margin-top:20px;">
      Si vos no pediste este cambio, no hace falta que hagas nada — tu contraseña actual sigue funcionando.
    </p>
  `);

  try {
    await client.emails.send({ from: EMAIL_FROM, to, subject: "Restablecer tu contraseña — .clinika", html });
  } catch (err) {
    console.error("[email] error enviando reset de contraseña", err);
  }
}
