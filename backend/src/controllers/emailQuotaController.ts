import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getEmailQuotaStatus, getCurrentEmailCount, canSendEmail } from '../services/emailQuotaService';

/**
 * Get current email quota status (admin only)
 */
export const getEmailQuota = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quotaStatus = getEmailQuotaStatus();
    
    res.json({
      success: true,
      data: quotaStatus
    });
  } catch (error: unknown) {
    console.error('Error getting email quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email quota status'
    });
  }
};

/**
 * Get email quota statistics
 */
export const getEmailQuotaStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quotaStatus = getEmailQuotaStatus();
    const canSend = canSendEmail();
    
    res.json({
      success: true,
      data: {
        ...quotaStatus,
        canSend: canSend.canSend,
        estimatedEmailsRemaining: canSend.remaining
      }
    });
  } catch (error: unknown) {
    console.error('Error getting email quota stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email quota statistics'
    });
  }
};

