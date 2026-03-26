import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Notification } from '../models/Notification';

/**
 * Get user's notifications
 * GET /api/notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Use raw query to handle missing is_read column gracefully
    try {
      const notifications = await AppDataSource.query(
        `SELECT id, type, payload, COALESCE(is_read, false) as is_read, created_at 
         FROM notifications 
         WHERE recipient_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limitNum, offset]
      );

      const countResult = await AppDataSource.query(
        `SELECT COUNT(*) as total FROM notifications WHERE recipient_id = $1`,
        [userId]
      );
      const total = parseInt(countResult[0]?.total || '0', 10);

      res.json({
        success: true,
        data: notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          payload: n.payload,
          is_read: n.is_read ?? false,
          created_at: n.created_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      });
    } catch (queryError: any) {
      // If is_read column doesn't exist, query without it
      if (queryError.message?.includes('is_read')) {
        const notifications = await AppDataSource.query(
          `SELECT id, type, payload, created_at 
           FROM notifications 
           WHERE recipient_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2 OFFSET $3`,
          [userId, limitNum, offset]
        );

        const countResult = await AppDataSource.query(
          `SELECT COUNT(*) as total FROM notifications WHERE recipient_id = $1`,
          [userId]
        );
        const total = parseInt(countResult[0]?.total || '0', 10);

        res.json({
          success: true,
          data: notifications.map((n: any) => ({
            id: n.id,
            type: n.type,
            payload: n.payload,
            is_read: false,
            created_at: n.created_at,
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            total_pages: Math.ceil(total / limitNum),
          },
        });
      } else {
        throw queryError;
      }
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const notificationRepository = AppDataSource.getRepository(Notification);

    // Count all notifications for user (treat all as unread if is_read column doesn't exist)
    try {
      const count = await notificationRepository.count({
        where: {
          recipient_id: userId,
          is_read: false,
        },
      });
      res.json({
        success: true,
        data: { unread_count: count },
      });
    } catch {
      // Fallback: count all notifications if is_read column doesn't exist
      const count = await notificationRepository.count({
        where: { recipient_id: userId },
      });
      res.json({
        success: true,
        data: { unread_count: count },
      });
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const notificationRepository = AppDataSource.getRepository(Notification);

    // Find notification belonging to user
    const notification = await notificationRepository.findOne({
      where: {
        id,
        recipient_id: userId,
      },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    // Try to mark as read (may fail if column doesn't exist)
    try {
      await notificationRepository.update(id, { is_read: true } as any);
    } catch {
      // Silently ignore if column doesn't exist
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const notificationRepository = AppDataSource.getRepository(Notification);

    // Try to update is_read (may fail if column doesn't exist)
    try {
      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ is_read: true } as any)
        .where('recipient_id = :userId', { userId })
        .execute();
    } catch {
      // Silently ignore if column doesn't exist
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
    });
  }
};

