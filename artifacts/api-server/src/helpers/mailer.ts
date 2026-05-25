import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "Kuber Quant <noreply@kuberquant.com>";

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    return false;
  }
  try {
    const from = process.env.SMTP_FROM || "Kuber Quant <noreply@kuberquant.com>";
    await t.sendMail({ from, ...opts });
    return true;
  } catch (err) {
    return false;
  }
}

export function buildPasswordResetEmail(opts: { name: string; resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Password Reset - Kuber Quant</title></head>
<body style="margin:0;padding:0;background:#050A14;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0a1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d1f3c,#050A14);padding:32px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.2)">
      <div style="font-size:24px;font-weight:bold;color:#D4AF37;letter-spacing:-0.5px">KUBER QUANT</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">kuberquant.com</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px">Password Reset Request</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6">
        Hi ${opts.name}, we received a request to reset your Kuber Quant account password. Click the button below to set a new password.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.resetUrl}" style="background:linear-gradient(135deg,#D4AF37,#f59e0b);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px">
          Reset Password
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background:rgba(0,0,0,0.2);padding:20px;text-align:center">
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">
        &copy; ${new Date().getFullYear()} Kuber Quant &mdash; kuberquant.com<br/>
        <a href="mailto:support@kuberquant.com" style="color:rgba(212,175,55,0.6);text-decoration:none">support@kuberquant.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildWelcomeEmail(opts: { name: string; loginUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Kuber Quant</title></head>
<body style="margin:0;padding:0;background:#050A14;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0a1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d1f3c,#050A14);padding:32px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.2)">
      <div style="font-size:24px;font-weight:bold;color:#D4AF37;letter-spacing:-0.5px">KUBER QUANT</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">kuberquant.com</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px">Welcome, ${opts.name}!</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6">
        Your Kuber Quant account is ready. Start your wealth multiplication journey with institutional-grade algorithmic trading and investment plans.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.loginUrl}" style="background:linear-gradient(135deg,#D4AF37,#f59e0b);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px">
          Access Your Dashboard
        </a>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.2);padding:20px;text-align:center">
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">
        &copy; ${new Date().getFullYear()} Kuber Quant &mdash; kuberquant.com
      </p>
    </div>
  </div>
</body>
</html>`;
}
