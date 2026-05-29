import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests from your App.jsx frontend
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, studentName, status, items } = req.body;

  // Converts the items array into clean HTML bullet points
  const itemsHtml = items.map(i => `<li>${i.itemName} (x${i.quantity})</li>`).join('');
  
  // Modern, clean styled HTML structure for the notification email
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; color: #334155; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto;">
      <h2 style="color: #4f46e5; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">Robotics Hub Notification</h2>
      <p style="font-size: 16px; margin-top: 20px;">Hello <strong>${studentName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6;">The status of your equipment borrow request has been updated to: 
         <span style="font-weight: bold; padding: 3px 8px; border-radius: 6px; background-color: ${status === 'Approved' ? '#ecfdf5' : '#fef2f2'}; color: ${status === 'Approved' ? '#059669' : '#dc2626'};">${status}</span>.
      </p>
      <h3 style="color: #0f172a; margin-top: 24px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Requested Items Breakdown:</h3>
      <ul style="background-color: #f8fafc; padding: 15px 35px; border-radius: 8px; color: #475569; line-height: 1.7; font-size: 15px;">
        ${itemsHtml}
      </ul>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 11px; color: #94a3b8; font-family: monospace; text-align: center; margin-bottom: 0;">Pascian Robotics Hub • Automated Transaction Mailer</p>
    </div>
  `;

  // Sets up Nodemailer to log into Gmail securely using your Vercel Env Variables
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `"Pascian Robotics Hub" <${process.env.EMAIL_USER}>`,
      to: to, // Dynamic student email recipient
      subject: subject,
      html: htmlContent
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}