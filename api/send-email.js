import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, student, asset } = req.body;
  const currentYear = new Date().getFullYear();
  
  let subject = '';
  let htmlPayload = '';

  if (type === 'APPROVE') {
    subject = `[APPROVED] Hardware Allocation Receipt: ${asset.name}`;
    htmlPayload = `
      <div style="font-family: sans-serif; 
      max-width: 600px; 
      color: #334155; 
      padding: 20px; 
      border: 1px solid #e2e8f0; 
      border-radius: 
      12px;">

        <h2 style="color: #4f46e5; margin-bottom: 4px;">Laboratory Asset Authorization Granted</h2>
        <p style="font-size: 14px; color: #64748b; margin-top: 0;">Computer Lab Management Core System</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p>Hello <strong>${student.name}</strong>,</p>
        <p>Your requisition for lab equipment has passed verification holds and is officially <strong>Authorized</strong> for immediate release.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b;">Allocation Specifications:</h4>
          <strong>Hardware Entity:</strong> ${asset.name}<br />
          <strong>System Entity ID Tag:</strong> ${asset.id}-TAG<br />
          <strong>Student Account Node:</strong> ${student.email}<br />
          <strong>Academic Group Track:</strong> ${student.gradeSection}
        </div>

        <p style="font-size: 13px; color: #64748b;">⚠️ <strong>Operational Guidelines:</strong> Return this asset immediately upon coursework deadline completion.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">&copy; ${currentYear} Computer Laboratory Infrastructure Network Core.</p>
      </div>
    `;
  } else if (type === 'REJECT') {
    subject = `[DECLINED] Lab Allocation Update: ${asset.name}`;
    htmlPayload = `
      <div style="font-family: sans-serif; max-width: 600px; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #e11d48; margin-bottom: 4px;">Hardware Request Denied</h2>
        <p style="font-size: 14px; color: #64748b; margin-top: 0;">Computer Lab Management Core System</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p>Hello <strong>${student.name}</strong>,</p>
        <p>We are unable to fulfill your request for physical resource allocation regarding <strong>${asset.name}</strong> at this time due to lab scheduling conflicts or stock constraints.</p>
        <p>Your pending asset hold reservation has been canceled, and the inventory space block has reverted to public availability pools.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">&copy; ${currentYear} Computer Laboratory Infrastructure Network Core.</p>
      </div>
    `;
  }

  try {
    // Send email using Resend
    const data = await resend.emails.send({
      from: 'Pascian Robotics Hub <lejanie.baya@deped.gov.ph>',
      to: [student.email],
      subject: subject,
      html: htmlPayload,
    });
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}