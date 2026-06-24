const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mehtaved12@gmail.com";
const FROM_EMAIL = "GlamSpot <onboarding@resend.dev>";

let ResendClient: any = null;

async function getResend() {
  if (ResendClient) return ResendClient;
  try {
    const { Resend } = await import("resend");
    ResendClient = new Resend(RESEND_API_KEY);
    return ResendClient;
  } catch {
    return null;
  }
}

export async function sendClaimNotification(data: {
  salonName: string;
  salonId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  verificationMessage: string;
  submittedDate: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const resend = await getResend();
    if (!resend) {
      console.warn("[Email] Resend not configured, skipping claim notification");
      return false;
    }

    const adminUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const viewLink = `${adminUrl}/admin/claims`;
    const approveLink = `${adminUrl}/admin/claims`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "New Salon Claim Request - GlamSpot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e8e8e8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; color: #FF4FA2; margin: 0;">GlamSpot</h1>
            <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0;">New Salon Claim Request</p>
          </div>

          <div style="background: #FFF5F7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280; width: 140px;">Salon</td>
                <td style="padding: 8px 12px;">${data.salonName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280;">Claimant</td>
                <td style="padding: 8px 12px;">${data.claimantName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280;">Email</td>
                <td style="padding: 8px 12px;">${data.claimantEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280;">Phone</td>
                <td style="padding: 8px 12px;">${data.claimantPhone || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280; vertical-align: top;">Verification Message</td>
                <td style="padding: 8px 12px; font-style: italic; color: #6B7280;">${data.verificationMessage || "No message provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: 600; color: #6B7280;">Submitted At</td>
                <td style="padding: 8px 12px;">${data.submittedDate}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${viewLink}" style="display: inline-block; background: #FF4FA2; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-right: 8px;">View Claim</a>
            <a href="${approveLink}" style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">Approve Claim</a>
          </div>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
            This is an automated notification from GlamSpot. Please review this claim request in the admin dashboard.
          </p>
        </div>
      `,
    });

    console.log("[Email] Claim notification sent to admin");
    return true;
  } catch (error) {
    console.error("[Email] Failed to send claim notification:", error);
    return false;
  }
}

export async function sendClaimApproved(data: {
  email: string;
  salonName: string;
  ownerName: string;
}): Promise<boolean> {
  try {
    const resend = await getResend();
    if (!resend) return false;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Salon Claim Approved - GlamSpot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e8e8e8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; color: #FF4FA2; margin: 0;">GlamSpot</h1>
            <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0;">Salon Claim Approved</p>
          </div>

          <div style="background: #ECFDF5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #065F46; font-weight: 600; margin: 0;">Congratulations!</p>
            <p style="font-size: 14px; color: #065F46; margin: 8px 0 0;">
              Your salon ownership request for <strong>${data.salonName}</strong> has been approved.
            </p>
          </div>

          <p style="font-size: 14px; color: #374151; text-align: center;">
            You are now the verified owner of <strong>${data.salonName}</strong> on GlamSpot. You can now manage your salon, respond to reviews, and access all owner features from your dashboard.
          </p>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
            This is an automated notification from GlamSpot.
          </p>
        </div>
      `,
    });

    console.log(`[Email] Approval notification sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send approval notification:", error);
    return false;
  }
}

export async function sendClaimRejected(data: {
  email: string;
  salonName: string;
  ownerName: string;
}): Promise<boolean> {
  try {
    const resend = await getResend();
    if (!resend) return false;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Salon Claim Rejected - GlamSpot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e8e8e8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; color: #FF4FA2; margin: 0;">GlamSpot</h1>
            <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0;">Status Update</p>
          </div>

          <div style="background: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #991B1B; font-weight: 600; margin: 0;">Request Rejected</p>
            <p style="font-size: 14px; color: #991B1B; margin: 8px 0 0;">
              Your salon ownership request for <strong>${data.salonName}</strong> has been rejected.
            </p>
          </div>

          <p style="font-size: 14px; color: #374151; text-align: center;">
            If you believe this is a mistake, please contact our support team or submit a new claim request with additional verification information.
          </p>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 24px; border-top: 1px solid #e8e8e8; padding-top: 16px;">
            This is an automated notification from GlamSpot.
          </p>
        </div>
      `,
    });

    console.log(`[Email] Rejection notification sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send rejection notification:", error);
    return false;
  }
}

export async function sendOwnershipTransfer(data: {
  newOwnerEmail: string;
  newOwnerName: string;
  salonName: string;
  oldOwnerName: string;
}): Promise<boolean> {
  try {
    const resend = await getResend();
    if (!resend) return false;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Ownership Transferred - ${data.salonName} - GlamSpot`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #FF4FA2;">Ownership Transfer Notification</h2>
          <p>Salon <strong>${data.salonName}</strong> has been transferred from <strong>${data.oldOwnerName}</strong> to <strong>${data.newOwnerName}</strong>.</p>
        </div>
      `,
    });

    console.log(`[Email] Transfer notification sent`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send transfer notification:", error);
    return false;
  }
}

export async function sendOwnershipRemoved(data: {
  salonName: string;
  previousOwnerName: string;
  previousOwnerEmail: string;
}): Promise<boolean> {
  try {
    const resend = await getResend();
    if (!resend) return false;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Ownership Removed - ${data.salonName} - GlamSpot`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #FF4FA2;">Ownership Removal Notification</h2>
          <p>Ownership for <strong>${data.salonName}</strong> has been removed from <strong>${data.previousOwnerName}</strong> (${data.previousOwnerEmail}). The salon is now unclaimed.</p>
        </div>
      `,
    });

    console.log(`[Email] Removal notification sent`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send removal notification:", error);
    return false;
  }
}
