import { DatabaseService } from '../db/index.js';
import { AuthActor, can } from '../auth/policy.js';

export interface MessMenuRecord {
  id: string;
  week_start_date: string;
  week_end_date: string;
  mess_scope: string;
  image_url: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  description?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  published_at?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadMessMenuInput {
  week_start_date: string; // YYYY-MM-DD
  week_end_date: string;   // YYYY-MM-DD
  mess_scope?: string;
  image_base64: string;    // Base64 data string (data:image/...;base64,... or pure base64)
  original_filename: string;
  content_type: string;
  description?: string;
  publish_immediately?: boolean;
}

export class MessMenuService {
  constructor(private db: DatabaseService) {}

  /**
   * Upload and register a new weekly mess menu
   */
  async uploadMenu(input: UploadMessMenuInput, actor: AuthActor): Promise<MessMenuRecord> {
    const allowedStaff = ['HOSTEL_OFFICE', 'WARDEN', 'CHIEF_WARDEN', 'SUPER_ADMIN'];
    if (!allowedStaff.includes(actor.role)) {
      throw new Error('FORBIDDEN: Only Hostel Office and administrative staff can upload mess menus');
    }

    if (!input.week_start_date || !input.week_end_date) {
      throw new Error('VALIDATION_ERROR: Week start and end dates are required');
    }

    if (!input.image_base64 || input.image_base64.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Menu image payload is required');
    }

    // Server-side MIME validation
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const mime = input.content_type?.toLowerCase().trim();
    if (!allowedMime.includes(mime)) {
      throw new Error(`VALIDATION_ERROR: Unsupported file format "${mime}". Allowed formats: JPEG, PNG, WebP.`);
    }

    // Size limit check: max 10MB
    const base64Clean = input.image_base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const sizeBytes = Math.floor((base64Clean.length * 3) / 4);
    if (sizeBytes > 10 * 1024 * 1024) {
      throw new Error('VALIDATION_ERROR: Image file size exceeds the 10MB limit');
    }

    const menuId = `menu_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const messScope = input.mess_scope?.trim() || 'CAMPUS_CENTRAL';
    const isPublish = Boolean(input.publish_immediately);
    const status = isPublish ? 'PUBLISHED' : 'DRAFT';
    const publishedAt = isPublish ? new Date().toISOString() : null;

    // Secure Data URL storage representation
    const secureImageUrl = input.image_base64.startsWith('data:') 
      ? input.image_base64 
      : `data:${mime};base64,${base64Clean}`;

    const res = await this.db.query(
      `INSERT INTO mess_menus (
         id, week_start_date, week_end_date, mess_scope, image_url,
         original_filename, content_type, file_size_bytes, description,
         status, published_at, uploaded_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        menuId,
        input.week_start_date,
        input.week_end_date,
        messScope,
        secureImageUrl,
        input.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_'),
        mime,
        sizeBytes,
        input.description?.trim() || null,
        status,
        publishedAt,
        actor.id,
      ]
    );

    // If published, emit a clean, broadcast notification for all students
    if (isPublish) {
      const notifId = `notif_menu_${menuId}`;
      await this.db.query(
        `INSERT INTO notifications (id, category, priority, title, message, target_audience, reference_id, reference_type, author_name)
         VALUES ($1, 'NOTICE', 'NORMAL', $2, $3, 'STUDENTS', $4, 'MESS_MENU', 'Hostel Mess Office')
         ON CONFLICT (id) DO NOTHING`,
        [
          notifId,
          `Weekly Mess Menu Published`,
          `The official weekly mess menu for the week of ${input.week_start_date} to ${input.week_end_date} has been published.`,
          menuId,
        ]
      );
    }

    return res.rows[0];
  }

  /**
   * Publish or update status of an existing menu
   */
  async updateMenuStatus(menuId: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', actor: AuthActor): Promise<MessMenuRecord> {
    const allowedStaff = ['HOSTEL_OFFICE', 'WARDEN', 'CHIEF_WARDEN', 'SUPER_ADMIN'];
    if (!allowedStaff.includes(actor.role)) {
      throw new Error('FORBIDDEN: Only Hostel Office can publish or modify mess menus');
    }

    const exist = await this.db.query(`SELECT * FROM mess_menus WHERE id = $1`, [menuId]);
    if (exist.rows.length === 0) throw new Error('NOT_FOUND: Mess menu record not found');
    const current = exist.rows[0];

    const publishedAt = status === 'PUBLISHED' && !current.published_at ? new Date().toISOString() : current.published_at;

    const res = await this.db.query(
      `UPDATE mess_menus 
       SET status = $1, published_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, publishedAt, menuId]
    );

    if (status === 'PUBLISHED' && current.status !== 'PUBLISHED') {
      const notifId = `notif_menu_${menuId}`;
      await this.db.query(
        `INSERT INTO notifications (id, category, priority, title, message, target_audience, reference_id, reference_type, author_name)
         VALUES ($1, 'NOTICE', 'NORMAL', $2, $3, 'STUDENTS', $4, 'MESS_MENU', 'Hostel Mess Office')
         ON CONFLICT (id) DO NOTHING`,
        [
          notifId,
          `Weekly Mess Menu Published`,
          `The official weekly mess menu for the week of ${current.week_start_date} to ${current.week_end_date} has been published.`,
          menuId,
        ]
      );
    }

    return res.rows[0];
  }

  /**
   * Get active published mess menu for students/staff
   */
  async getActiveMenu(messScope: string = 'CAMPUS_CENTRAL', actor: AuthActor): Promise<MessMenuRecord | null> {
    // Current date in ISO format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Priority: published menu covering current date, else most recent published menu
    const res = await this.db.query(
      `SELECT * FROM mess_menus
       WHERE mess_scope = $1 AND status = 'PUBLISHED'
       ORDER BY 
         CASE WHEN week_start_date <= $2 AND week_end_date >= $2 THEN 0 ELSE 1 END ASC,
         week_start_date DESC
       LIMIT 1`,
      [messScope, today]
    );

    return res.rows[0] || null;
  }

  /**
   * List menus (for student history or staff admin workbench)
   */
  async listMenus(actor: AuthActor, messScope: string = 'CAMPUS_CENTRAL'): Promise<MessMenuRecord[]> {
    const isStaff = ['HOSTEL_OFFICE', 'WARDEN', 'CHIEF_WARDEN', 'SUPER_ADMIN'].includes(actor.role);

    let sql = `SELECT * FROM mess_menus WHERE mess_scope = $1`;
    const params: any[] = [messScope];

    if (!isStaff) {
      // Students only see PUBLISHED menus
      sql += ` AND status = 'PUBLISHED'`;
    }

    sql += ` ORDER BY week_start_date DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }
}
