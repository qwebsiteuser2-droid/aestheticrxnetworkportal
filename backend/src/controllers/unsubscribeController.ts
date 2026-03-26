import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import crypto from 'crypto';

/**
 * Generate unsubscribe token for a user
 */
function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET environment variable is required');
  }
  const data = `${userId}:${email}:${secret}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify unsubscribe token
 */
function verifyUnsubscribeToken(token: string, userId: string, email: string): boolean {
  const expectedToken = generateUnsubscribeToken(userId, email);
  return token === expectedToken;
}

/**
 * GET /api/unsubscribe/:userId/:token
 * Show unsubscribe confirmation page
 */
export const showUnsubscribePage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.params;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe link'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'doctor_name', 'email_unsubscribed']
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify token
    if (!verifyUnsubscribeToken(token, userId, user.email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe token'
      });
      return;
    }

    // Return user info for frontend to display
    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        doctorName: user.doctor_name,
        isUnsubscribed: user.email_unsubscribed,
        token: token
      }
    });
  } catch (error: unknown) {
    console.error('Error showing unsubscribe page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load unsubscribe page'
    });
  }
};

/**
 * POST /api/unsubscribe/:userId/:token
 * Process unsubscribe request
 */
export const processUnsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.params;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe link'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify token
    if (!verifyUnsubscribeToken(token, userId, user.email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe token'
      });
      return;
    }

    // Update user to unsubscribed
    user.email_unsubscribed = true;
    user.email_unsubscribed_at = new Date();
    await doctorRepository.save(user);

    console.log(`✅ User ${user.email} unsubscribed from marketing emails`);

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from marketing emails. You will no longer receive promotional emails, but you will still receive important transactional emails (order confirmations, tier updates, account notifications, etc.).',
      data: {
        email: user.email,
        unsubscribedAt: user.email_unsubscribed_at
      }
    });
  } catch (error: unknown) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process unsubscribe request'
    });
  }
};

/**
 * POST /api/unsubscribe/resubscribe/:userId/:token
 * Allow users to resubscribe
 */
export const processResubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.params;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'Invalid resubscribe link'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const user = await doctorRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify token
    if (!verifyUnsubscribeToken(token, userId, user.email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid resubscribe token'
      });
      return;
    }

    // Update user to resubscribed
    user.email_unsubscribed = false;
    user.email_unsubscribed_at = undefined;
    await doctorRepository.save(user);

    console.log(`✅ User ${user.email} resubscribed to marketing emails`);

    res.json({
      success: true,
      message: 'You have been successfully resubscribed to marketing emails. You will now receive promotional emails and automatic campaigns from us.',
      data: {
        email: user.email
      }
    });
  } catch (error: unknown) {
    console.error('Error processing resubscribe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process resubscribe request'
    });
  }
};

/**
 * Export helper function to generate unsubscribe URL
 */
export function getUnsubscribeUrl(userId: string, email: string): string {
  const token = generateUnsubscribeToken(userId, email);
  const { getFrontendUrlWithPath } = require('../config/urlConfig');
  return getFrontendUrlWithPath(`/unsubscribe/${userId}/${token}`);
}

/**
 * Export helper function to generate resubscribe URL
 */
export function getResubscribeUrl(userId: string, email: string): string {
  const token = generateUnsubscribeToken(userId, email);
  const { getFrontendUrlWithPath } = require('../config/urlConfig');
  return getFrontendUrlWithPath(`/unsubscribe/resubscribe/${userId}/${token}`);
}

