import { NextRequest, NextResponse } from 'next/server';
import { sendIssueStatusEmailNotification, EmailNotificationPayload } from '@/lib/emailService';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// POST: Trigger email notification to citizen
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticketId,
      issueId,
      recipientEmail,
      previousStatus = 'Submitted',
      newStatus,
      issueTitle,
      category,
      locationAddress,
      notes,
      performedBy,
      resolutionSummary,
    } = body;

    if (!ticketId || !recipientEmail || !newStatus) {
      return NextResponse.json(
        { error: 'Missing required parameters: ticketId, recipientEmail, and newStatus are required.' },
        { status: 400 }
      );
    }

    const payload: EmailNotificationPayload = {
      ticketId,
      issueId,
      recipientEmail,
      previousStatus,
      newStatus,
      issueTitle: issueTitle || 'Civic Issue',
      category: category || 'Municipal Services',
      locationAddress: locationAddress || 'Civic District',
      notes,
      performedBy: performedBy || 'Municipal Authority',
      resolutionSummary,
    };

    const result = await sendIssueStatusEmailNotification(payload);

    // Audit log
    try {
      await addDoc(collection(db, 'auditLogs'), {
        timestamp: new Date().toISOString(),
        userId: performedBy || 'notification_system',
        action: 'NOTIFICATION_EMAIL_SENT',
        portal: 'system',
        status: 'SUCCESS',
        details: `Dispatched status transition notification email to ${recipientEmail} for Ticket #${ticketId} (${previousStatus} ➔ ${newStatus})`,
      });
    } catch {
      try {
        const adminDb = getAdminDb();
        await adminDb.collection('auditLogs').add({
          timestamp: new Date().toISOString(),
          userId: performedBy || 'notification_system',
          action: 'NOTIFICATION_EMAIL_SENT',
          portal: 'system',
          status: 'SUCCESS',
          details: `Dispatched status transition notification email to ${recipientEmail} for Ticket #${ticketId} (${previousStatus} ➔ ${newStatus})`,
        });
      } catch (e) {
        console.warn('Audit log write error for notification:', e);
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Notification email dispatched to citizen (${recipientEmail})`
        : `Email delivery failed: ${result.error}`,
      notification: result,
    });
  } catch (error: any) {
    console.error('Error dispatching notification email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch email notification' },
      { status: 500 }
    );
  }
}

// GET: Retrieve sent notifications for a citizen or ticket
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientEmail = searchParams.get('recipientEmail');
    const ticketId = searchParams.get('ticketId');
    const limitCount = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    let notifications: any[] = [];

    try {
      // Build a targeted Firestore query — avoid full collection scan
      const ref = collection(db, 'emailNotifications');
      const constraints: any[] = [];

      if (recipientEmail) {
        constraints.push(where('recipientEmail', '==', recipientEmail.toLowerCase().trim()));
      } else if (ticketId) {
        constraints.push(where('ticketId', '==', ticketId.trim()));
      }

      constraints.push(orderBy('sentAt', 'desc'));
      constraints.push(firestoreLimit(limitCount));

      const snapshot = await getDocs(query(ref, ...constraints));
      notifications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Apply secondary filter if both params provided
      if (recipientEmail && ticketId) {
        const tidLower = ticketId.trim().toLowerCase();
        notifications = notifications.filter(
          (n) => (n.ticketId || '').toLowerCase() === tidLower
        );
      }
    } catch (clientErr) {
      console.warn('[Notifications GET] Client SDK indexed query failed, trying unindexed with in-memory sort:', (clientErr as any)?.message);
      try {
        const ref = collection(db, 'emailNotifications');
        const constraints: any[] = [];
        if (recipientEmail) {
          constraints.push(where('recipientEmail', '==', recipientEmail.toLowerCase().trim()));
        } else if (ticketId) {
          constraints.push(where('ticketId', '==', ticketId.trim()));
        }
        const snapshot = await getDocs(query(ref, ...constraints));
        notifications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        notifications.sort(
          (a: any, b: any) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
        );
        notifications = notifications.slice(0, limitCount);
      } catch (fallbackErr) {
        // Fall back to admin SDK
        try {
          const adminDb = getAdminDb();
          let adminQ = adminDb.collection('emailNotifications') as any;
          if (recipientEmail) {
            adminQ = adminQ.where('recipientEmail', '==', recipientEmail.toLowerCase().trim());
          } else if (ticketId) {
            adminQ = adminQ.where('ticketId', '==', ticketId.trim());
          }
          const snap = await adminQ.get();
          notifications = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          notifications.sort(
            (a: any, b: any) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
          );
          notifications = notifications.slice(0, limitCount);
        } catch (adminErr) {
          console.error('[Notifications GET] Admin SDK fallback error:', adminErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err: any) {
    console.error('Error querying email notifications:', err);
    return NextResponse.json({ success: true, count: 0, notifications: [] });
  }
}
