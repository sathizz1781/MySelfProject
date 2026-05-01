import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendOtpEmail(to, otp) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"My World" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your password reset code",
    text: `Your OTP is: ${otp}\n\nThis code expires in 15 minutes. If you did not request a reset, ignore this email.`,
    html: `
      <div style="font-family:'Sora',sans-serif;max-width:480px;margin:auto;background:#111118;color:#f0f0f8;border-radius:16px;padding:2rem;border:1px solid #2a2a3a;">
        <div style="font-size:1.1rem;font-weight:700;margin-bottom:1.5rem;">
          <span style="background:#6c63ff;border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;">■</span>
          &nbsp;My World
        </div>
        <h2 style="font-size:1.4rem;margin-bottom:0.5rem;">Password Reset</h2>
        <p style="color:#8888aa;margin-bottom:1.5rem;">Use the code below to reset your password. It expires in <strong style="color:#f0f0f8;">15 minutes</strong>.</p>
        <div style="font-size:2.2rem;font-weight:700;letter-spacing:0.4em;background:#1a1a24;border:1px solid #2a2a3a;border-radius:12px;padding:1.2rem;text-align:center;color:#8b85ff;">
          ${otp}
        </div>
        <p style="color:#8888aa;font-size:0.85rem;margin-top:1.5rem;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}
