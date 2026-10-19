import { DatabaseService } from '../db/index.js';
import { AuthActor } from '../auth/policy.js';

export interface NotificationRecord {
  id: string;
  user_id?: string | null;
  category: 'NOTICE' | 'COMPLAINT' | 'ALLOTMENT' | 'SYSTEM';
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  title: string;
  message: string;
  target_audience: string;
  building_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at: string;
  is_read?: boolean;
}

export class NotificationService {
  constructor(private db: DatabaseService) {}

  /**
   * Insert a notification (broadcast or directed)
   */
  async createNotification(data: {
    user_id?: string | null;
    category: 'NOTICE' | 'COMPLAINT' | 'ALLOTMENT' | 'SYSTEM';
    priority?: 'NORMAL' | 'URGENT' | 'HIGH';
    title: string;
    message: string;
    target_audience?: string;
    building_id?: string | null;
    reference_id?: string | null;
    reference_type?: string | null;
    author_id?: string | null;
    author_name?: string | null;
  }): Promise<NotificationRecord> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const priority = data.priority || 'NORMAL';
    const targetAudience = data.target_audience || 'ALL';

    const res = await this.db.query(
      `INSERT INTO notifications (
        id, user_id, category, priority, title, message, target_audience,
        building_id, reference_id, reference_type, author_id, author_name
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        data.user_id || null,
        data.category,
        priority,
        data.title,
        data.message,
        targetAudience,
        data.building_id || null,
        data.reference_id || null,
        data.reference_type || null,
        data.author_id || null,
        data.author_name || null,
      ]
    );

    return res.rows[0];
  }

  /**
   * Publish an official announcement / notice by administrative staff
   */
  async publishNotice(
    input: {
      title: string;
      message: string;
      category?: 'NOTICE' | 'ALLOTMENT' | 'SYSTEM';
      priority?: 'NORMAL' | 'URGENT' | 'HIGH';
      target_audience?: 'ALL' | 'STUDENTS' | 'ADMIN' | 'BVB_BLOCK';
      building_id?: string | null;
    },
    actor: AuthActor
  ): Promise<NotificationRecord> {
    // Only administrative roles can publish official notices
    const allowedRoles = ['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_OFFICE', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(actor.role)) {
      throw new Error('FORBIDDEN: Only hostel administrative staff and wardens can publish official notices');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Notice title is required');
    }
    if (!input.message || input.message.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Notice message content is required');
    }

    let authorName = actor.role.replace('_', ' ');
    if (actor.role === 'CHIEF_WARDEN') authorName = 'Chief Warden';
    else if (actor.role === 'WARDEN') authorName = 'Building Warden';
    else if (actor.role === 'HOSTEL_OFFICE') authorName = 'Hostel Office';
    else if (actor.role === 'SUPER_ADMIN') authorName = 'System Administration';

    return this.createNotification({
      category: input.category || 'NOTICE',
      priority: input.priority || 'NORMAL',
      title: input.title.trim(),
      message: input.message.trim(),
      target_audience: input.target_audience || 'ALL',
      building_id: input.building_id || null,
      author_id: actor.id,
      author_name: authorName,
      reference_type: 'NOTICE',
    });
  }

  /**
   * List notifications for a given user with unread status calculation
   */
  async listNotifications(actor: AuthActor): Promise<{
    notifications: NotificationRecord[];
    unreadCount: number;
  }> {
    // Determine audience filter
    const audienceList = ['ALL'];
    if (actor.role === 'STUDENT') {
      audienceList.push('STUDENTS');
    } else {
      audienceList.push('ADMIN');
    }

    // Query notifications matching user or broad audience, left join read status
    const res = await this.db.query(
      `SELECT 
         n.id,
         n.user_id,
         n.category,
         n.priority,
         n.title,
         n.message,
         n.target_audience,
         n.building_id,
         n.reference_id,
         n.reference_type,
         n.author_id,
         n.author_name,
         n.created_at,
         CASE WHEN r.read_at IS NOT NULL THEN TRUE ELSE FALSE END as is_read
       FROM notifications n
       LEFT JOIN user_notification_reads r 
         ON n.id = r.notification_id AND r.user_id = $1
       WHERE (n.user_id IS NULL OR n.user_id = $1)
         AND (n.target_audience = ANY($2))
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [actor.id, audienceList]
    );

    const notifications: NotificationRecord[] = res.rows.map((row: any) => ({
      ...row,
      is_read: Boolean(row.is_read),
    }));

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, actor: AuthActor): Promise<void> {
    const id = `read_${notificationId}_${actor.id}`;
    await this.db.query(
      `INSERT INTO user_notification_reads (id, notification_id, user_id, read_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (notification_id, user_id) DO NOTHING`,
      [id, notificationId, actor.id]
    );
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(actor: AuthActor): Promise<void> {
    const audienceList = ['ALL'];
    if (actor.role === 'STUDENT') {
      audienceList.push('STUDENTS');
    } else {
      audienceList.push('ADMIN');
    }

    const unreadRes = await this.db.query(
      `SELECT n.id 
       FROM notifications n
       LEFT JOIN user_notification_reads r 
         ON n.id = r.notification_id AND r.user_id = $1
       WHERE (n.user_id IS NULL OR n.user_id = $1)
         AND (n.target_audience = ANY($2))
         AND r.read_at IS NULL`,
      [actor.id, audienceList]
    );

    for (const row of unreadRes.rows) {
      const id = `read_${row.id}_${actor.id}`;
      await this.db.query(
        `INSERT INTO user_notification_reads (id, notification_id, user_id, read_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [id, row.id, actor.id]
      );
    }
  }
}
