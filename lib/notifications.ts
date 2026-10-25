// Client-side helper for triggering and fetching email notifications

export interface TriggerNotificationParams {
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

export interface EmailNotificationItem {
  id: string;
  ticketId: string;
  issueId?: string;
  recipientEmail: string;
  subject: string;
  previousStatus: string;
  newStatus: string;
  status: string;
  message: string;
  htmlBody: string;
  textBody?: string;
  dispatchMode?: 'smtp' | 'preview_simulation';
  sentAt: string;
}

export async function triggerStatusChangeEmail(params: TriggerNotificationParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/notifications/send-status-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to dispatch email' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    console.error('Error triggering status change email:', err);
    return { success: false, error: err?.message || 'Network error dispatching email' };
  }
}

export async function fetchCitizenEmailNotifications(
  recipientEmail: string
): Promise<EmailNotificationItem[]> {
  try {
    const res = await fetch(
      `/api/notifications/send-status-email?recipientEmail=${encodeURIComponent(recipientEmail)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.notifications || [];
  } catch (err) {
    console.warn('Error fetching email notifications:', err);
    return [];
  }
}
