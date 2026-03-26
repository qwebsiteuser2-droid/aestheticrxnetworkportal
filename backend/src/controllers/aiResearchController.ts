import { Request, Response } from 'express';
import aiResearchService from '../services/aiResearchService';
import { authenticate } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    is_admin?: boolean;
  };
}

export class AIResearchController {
  // Generate streaming research content using AI
  static async generateStreamingContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { researchType, contentType, userQuery, modelId, options } = req.body;
      const userId = req.user?.id || 'anonymous';

      // Validate input
      if (!researchType || !contentType || !userQuery) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: researchType, contentType, userQuery'
        });
        return;
      }

      // Check quota before processing
      const quotaStatus = aiResearchService.getQuotaStatus(userId);
      
      if (!quotaStatus.canMakeRequest) {
        const retryAfter = Math.ceil((quotaStatus.resetTime - Date.now()) / 1000);
        res.status(429).json({
          success: false,
          quotaExceeded: true,
          retryAfter,
          message: 'Research in progress... Our AI is currently processing multiple requests. Please wait a moment.',
          quotaStatus: {
            requestsUsed: quotaStatus.requestsUsed,
            requestsRemaining: quotaStatus.requestsRemaining,
            resetTime: quotaStatus.resetTime
          }
        });
        return;
      }

      // Set headers for streaming BEFORE calling the service
      // This ensures headers are set before any streaming starts
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Generate streaming content
      // The service will handle all streaming and errors
      await aiResearchService.generateStreamingContent({
        researchType,
        contentType,
        userQuery,
        userId,
        modelId,
        options
      }, res);

    } catch (error: unknown) {
      console.error('AI Research Streaming Controller Error:', error);
      
      // Only send JSON response if headers haven't been sent yet
      if (!res.headersSent) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({
        success: false,
          error: errorMessage || 'Internal server error'
      });
      } else {
        // Headers already sent, try to write error to stream
        try {
          res.write(`\n\n[Error: ${error instanceof Error ? error.message : 'Internal server error'}]`);
          res.end();
        } catch (e) {
          // Response may already be closed
          console.error('Error writing error to streaming response:', e);
        }
      }
    }
  }

  // Generate research content using AI
  static async generateResearchContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { researchType, contentType, userQuery, modelId, options } = req.body;
      const userId = req.user?.id || 'anonymous';

      // Validate input
      if (!researchType || !contentType || !userQuery) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: researchType, contentType, userQuery'
        });
        return;
      }

      if (!['text', 'diagram', 'graph'].includes(contentType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contentType. Must be: text, diagram, or graph'
        });
        return;
      }

      // Check quota before processing
      const quotaStatus = aiResearchService.getQuotaStatus(userId);
      
      if (!quotaStatus.canMakeRequest) {
        const retryAfter = Math.ceil((quotaStatus.resetTime - Date.now()) / 1000);
        res.status(429).json({
          success: false,
          quotaExceeded: true,
          retryAfter,
          message: 'Research in progress... Our AI is currently processing multiple requests. Please wait a moment.',
          quotaStatus: {
            requestsUsed: quotaStatus.requestsUsed,
            requestsRemaining: quotaStatus.requestsRemaining,
            resetTime: quotaStatus.resetTime
          }
        });
        return;
      }

      // Generate content
      const result = await aiResearchService.generateResearchContent({
        researchType,
        contentType,
        userQuery,
        userId,
        modelId,
        options
      });

      if (result.success) {
        res.json({
          success: true,
          content: result.content,
          quotaStatus: aiResearchService.getQuotaStatus(userId)
        });
      } else {
        const statusCode = result.quotaExceeded ? 429 : 500;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          quotaExceeded: result.quotaExceeded,
          retryAfter: result.retryAfter,
          quotaStatus: aiResearchService.getQuotaStatus(userId)
        });
      }

    } catch (error: unknown) {
      console.error('AI Research Controller Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get quota status for current user
  static async getQuotaStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'anonymous';
      const quotaStatus = aiResearchService.getQuotaStatus(userId);

      res.json({
        success: true,
        quotaStatus
      });
    } catch (error: unknown) {
      console.error('Quota Status Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quota status'
      });
    }
  }

  // Reset quota (admin only)
  static async resetQuota(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.is_admin) {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const { userId } = req.body;
      aiResearchService.resetQuota(userId || 'default');

      res.json({
        success: true,
        message: 'Quota reset successfully'
      });
    } catch (error: unknown) {
      console.error('Reset Quota Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset quota'
      });
    }
  }

  // Get AI research suggestions
  static async getResearchSuggestions(req: Request, res: Response) {
    try {
      const { researchType } = req.query;

      const suggestions = {
        medical: [
          "Write an abstract for a cardiovascular disease prevention study",
          "Create a methodology section for clinical trials",
          "Generate a literature review on telemedicine",
          "Develop a research proposal for diabetes management",
          "Analyze patient outcomes in emergency medicine"
        ],
        technology: [
          "Design a machine learning algorithm for medical diagnosis",
          "Create a system architecture for telemedicine platforms",
          "Develop a mobile health application framework",
          "Analyze data security in healthcare systems",
          "Design an AI-powered patient monitoring system"
        ],
        general: [
          "Write a comprehensive research methodology",
          "Create a literature review framework",
          "Develop a data analysis plan",
          "Design a survey questionnaire",
          "Generate a research timeline and milestones"
        ]
      };

      const type = researchType as string || 'general';
      const typeSuggestions = suggestions[type as keyof typeof suggestions] || suggestions.general;

      res.json({
        success: true,
        suggestions: typeSuggestions
      });
    } catch (error: unknown) {
      console.error('Research Suggestions Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get research suggestions'
      });
    }
  }
}
