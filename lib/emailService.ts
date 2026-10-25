import nodemailer from 'nodemailer';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAdminDb } from './firebaseAdmin';

export interface EmailNotificationPayload {
  ticketId: string;
  issueId?: string;
  recipientEmail: string;
  previousStatus?: string;
  newStatus: string;
  issueTitle?: string;
  category?: string;
  locationAddress?: string;
  notes?: string;
  performedBy?: string;
  resolutionSummary?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  recipientEmail: string;
  ticketId: string;
  subject: string;
  htmlBody: string;
  mode: 'smtp' | 'preview_simulation';
  error?: string;
}

// Generate the subject line based on status transition
export function generateSubject(ticketId: string, newStatus: string, title?: string): string {
  const issueName = title ? ` - ${title}` : '';
  switch (newStatus) {
    case 'In Progress':
      return `[Civic Sentinel] Action Initiated on Ticket #${ticketId}: Status updated to IN PROGRESS`;
    case 'Resolved':
      return `[Civic Sentinel] Issue Resolved! Ticket #${ticketId} has been successfully addressed`;
    case 'Under Verification':
      return `[Civic Sentinel] Verification in progress for Ticket #${ticketId}`;
    case 'Resolution Failed':
      return `[Civic Sentinel] Notice: Inspection requires re-work for Ticket #${ticketId}`;
    case 'Submitted':
      return `[Civic Sentinel] Grievance Registered: Ticket #${ticketId}${issueName}`;
    default:
      return `[Civic Sentinel] Status Update for Ticket #${ticketId}: Now ${newStatus}`;
  }
}

// Return human-friendly status description and guidance
export function getStatusGuidance(previousStatus: string | undefined, newStatus: string): { bannerText: string; color: string; bg: string; border: string; detail: string } {
  switch (newStatus) {
    case 'In Progress':
      return {
        bannerText: 'WORK CREW DISPATCHED & IN PROGRESS',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#93c5fd',
        detail: 'The municipal department has reviewed your grievance, verified on-site requirements, and assigned a field response team. Repairs or remedial operations are currently active at the location.',
      };
    case 'Resolved':
      return {
        bannerText: 'ISSUE RESOLVED & VERIFIED ON-SITE',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#6ee7b7',
        detail: 'The assigned field authority has completed the necessary repairs. The work was verified using live geotagged evidence and automated spatial AI inspection. Please review the resolution proof and submit your citizen verification score.',
      };
    case 'Under Verification':
      return {
        bannerText: 'UNDER MUNICIPAL VERIFICATION',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        detail: 'Your report is being verified by zonal officers to validate coordinates, jurisdiction, and priority scheduling.',
      };
    case 'Resolution Failed':
      return {
        bannerText: 'RESOLUTION QUALITY AUDIT FAILED - SCHEDULED FOR RE-WORK',
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fca5a5',
        detail: 'The submitted resolution proof did not meet required municipal standards or AI spatial verification. The ticket has been flagged for re-inspection and immediate rectification.',
      };
    case 'Submitted':
    default:
      return {
        bannerText: 'SUBMITTED & LOGGED IN SYSTEM',
        color: '#475569',
        bg: '#f8fafc',
        border: '#cbd5e1',
        detail: 'Your grievance has been safely registered in the municipal decentralized ledger. It is queued for department triage and AI severity classification.',
      };
  }
}

// Build standard HTML email
export function generateEmailHtml(payload: EmailNotificationPayload): string {
  const {
    ticketId,
    recipientEmail,
    previousStatus = 'Submitted',
    newStatus,
    issueTitle = 'Civic Infrastructure Defect',
    category = 'Municipal Services',
    locationAddress = 'Geotagged Location',
    notes,
    performedBy = 'Civic Sentinel Operations Center',
    resolutionSummary,
  } = payload;

  const guidance = getStatusGuidance(previousStatus, newStatus);
  const nowStr = new Date().toUTCString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Civic Sentinel - Grievance Status Update</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #334155;
    }
    .wrapper {
      max-width: 640px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 24px 30px;
      color: #ffffff;
    }
    .header-logo {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #10b981;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header-sub {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge-container {
      background: ${guidance.bg};
      border-left: 4px solid ${guidance.color};
      padding: 18px 24px;
      margin: 20px 24px 10px 24px;
      border-radius: 6px;
    }
    .status-title {
      font-size: 12px;
      font-weight: 800;
      color: ${guidance.color};
      letter-spacing: 1px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .status-flow {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .status-detail {
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
    }
    .content-body {
      padding: 10px 24px 20px 24px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 20px;
      margin-top: 15px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .detail-label {
      width: 130px;
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
    }
    .detail-value {
      color: #0f172a;
      font-weight: 500;
    }
    .ticket-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #0f172a;
      color: #10b981;
      font-family: monospace;
      font-weight: 700;
      font-size: 13px;
      border-radius: 4px;
    }
    .cta-container {
      text-align: center;
      margin: 28px 0 10px 0;
    }
    .cta-button {
      display: inline-block;
      background: #0f172a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .footer {
      background: #f1f5f9;
      padding: 20px 24px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .footer-secure {
      display: inline-block;
      background: #e2e8f0;
      padding: 3px 8px;
      border-radius: 4px;
      color: #334155;
      font-family: monospace;
      font-size: 10px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Civic Sentinel</div>
      <div class="header-sub">Municipal Grievance Redressal & Verification Platform</div>
    </div>

    <div class="status-badge-container">
      <div class="status-title">${guidance.bannerText}</div>
      <div class="status-flow">
        Ticket #${ticketId}: <span style="color: #64748b; text-decoration: line-through;">${previousStatus}</span> &rarr; <span style="color: ${guidance.color}; font-weight: 800;">${newStatus}</span>
      </div>
      <div class="status-detail">${guidance.detail}</div>
    </div>

    <div class="content-body">
      <p style="font-size: 14px; line-height: 1.6; margin-top: 0; color: #334155;">
        Dear Citizen,
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        This is an official automated update regarding your civic grievance report registered with our municipal management system.
      </p>

      <div class="card">
        <div class="card-title">Grievance Dossier Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Ticket Reference:</td>
            <td style="padding: 6px 0;"><span class="ticket-badge">#${ticketId}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Issue Title:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${issueTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service Category:</td>
            <td style="padding: 6px 0; color: #0f172a;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Incident Location:</td>
            <td style="padding: 6px 0; color: #0f172a;">${locationAddress}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Updated By:</td>
            <td style="padding: 6px 0; color: #0f172a;">${performedBy}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
            <td style="padding: 6px 0; color: #64748b; font-family: monospace;">${nowStr}</td>
          </tr>
        </table>
      </div>

      ${
        notes || resolutionSummary
          ? `
      <div class="card" style="border-left: 3px solid #3b82f6;">
        <div class="card-title" style="color: #1e40af;">Authority Notes & Inspection Findings</div>
        <p style="font-size: 13px; line-height: 1.5; color: #1e293b; margin: 0;">
          ${notes || resolutionSummary}
        </p>
      </div>`
          : ''
      }

      <div class="cta-container">
        <a href="${process.env.APP_URL || 'https://ais-dev-jy7th7jaxcpcrasjv63w6y-152867556518.asia-southeast1.run.app'}/citizen" class="cta-button" target="_blank">
          View Complaint in Citizen Portal &rarr;
        </a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">
        This is an authoritative notification generated for <strong>${recipientEmail}</strong> by the Civic Sentinel Redressal System.
      </p>
      <p style="margin: 0;">
        If you did not report this issue, you may disregard this notice or report discrepancy to your ward supervisor.
      </p>
      <div class="footer-secure">
        SECURE TOKEN: CS-NOTIF-${ticketId}-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Plain text fallback
export function generateEmailText(payload: EmailNotificationPayload): string {
  const {
    ticketId,
    previousStatus = 'Submitted',
    newStatus,
    issueTitle = 'Civic Issue',
    category = 'General',
    locationAddress = 'Location Tagged',
    notes,
    performedBy = 'Civic Sentinel Operations Center',
  } = payload;

  return `
[CIVIC SENTINEL] STATUS UPDATE ON TICKET #${ticketId}

Dear Citizen,

Your reported civic grievance #${ticketId} has progressed to a new status:
Status Transition: ${previousStatus} -> ${newStatus}

ISSUE DOSSIER:
- Ticket ID: #${ticketId}
- Issue Title: ${issueTitle}
- Category: ${category}
- Location: ${locationAddress}
- Action Performed By: ${performedBy}
- Timestamp: ${new Date().toUTCString()}
${notes ? `\nOFFICER REMARKS:\n${notes}\n` : ''}

You can track your issue live and verify resolution by logging in to the Citizen Portal:
${process.env.APP_URL || 'https://ais-dev-jy7th7jaxcpcrasjv63w6y-152867556518.asia-southeast1.run.app'}/citizen

Civic Sentinel Municipal Redressal Network
  `.trim();
}

// Main notification dispatch function
export async function sendIssueStatusEmailNotification(
  payload: EmailNotificationPayload
): Promise<EmailDispatchResult> {
  const { ticketId, recipientEmail, newStatus, previousStatus } = payload;
  const subject = generateSubject(ticketId, newStatus, payload.issueTitle);
  const htmlBody = generateEmailHtml(payload);
  const textBody = generateEmailText(payload);

  let dispatchMode: 'smtp' | 'preview_simulation' = 'preview_simulation';
  let messageId: string = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let deliveryError: string | undefined = undefined;

  // Check if SMTP environment variables are configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"Civic Sentinel Notifications" <notifications@crowdcivic.org>`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      // Verify connection before sending
      await transporter.verify();

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      messageId = info.messageId || messageId;
      dispatchMode = 'smtp';
      console.log(`[EmailService] Sent email to ${recipientEmail} via SMTP. MessageId: ${messageId}`);
    } catch (err: any) {
      deliveryError = err?.message || 'SMTP delivery failed';
      console.warn(`[EmailService] SMTP delivery failed for ticket #${ticketId}:`, deliveryError);
    }
  } else {
    console.log(
      `[EmailService] SMTP not configured — simulation mode. Ticket #${ticketId} (${previousStatus} → ${newStatus}) to: ${recipientEmail}`
    );
  }

  // Persist to Firestore — status reflects actual delivery outcome
  const notificationRecord = {
    ticketId,
    issueId: payload.issueId || '',
    recipientEmail,
    subject,
    previousStatus: previousStatus || 'Submitted',
    newStatus,
    // 'delivered' only when SMTP succeeded; 'simulated' when no credentials; 'failed' on SMTP error
    status: dispatchMode === 'smtp' ? 'delivered' : deliveryError ? 'failed' : 'simulated',
    message: payload.notes || `Issue status changed from ${previousStatus || 'Submitted'} to ${newStatus}`,
    htmlBody,
    textBody,
    dispatchMode,
    messageId,
    sentAt: new Date().toISOString(),
    error: deliveryError || null,
  };

  try {
    await addDoc(collection(db, 'emailNotifications'), notificationRecord);
  } catch (clientDbErr) {
    try {
      const adminDb = getAdminDb();
      await adminDb.collection('emailNotifications').add(notificationRecord);
    } catch (adminDbErr) {
      console.warn('[EmailService] Could not persist notification to Firestore:', adminDbErr);
    }
  }

  return {
    // success=false only when SMTP was configured but failed — simulation is still considered success
    success: !deliveryError,
    messageId,
    recipientEmail,
    ticketId,
    subject,
    htmlBody,
    mode: dispatchMode,
    error: deliveryError,
  };
}
