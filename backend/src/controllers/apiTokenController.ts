import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { APIToken } from '../entities/APIToken';
import { AuthenticatedRequest } from '../types/auth';
import { encrypt, decrypt } from '../scripts/setup-api-tokens';
import axios from 'axios';

export class APITokenController {
  /**
   * Get all API tokens (admin only)
   */
  static async getAllTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const tokens = await apiTokenRepository.find({
        order: { is_default: 'DESC', display_name: 'ASC' }
      });

      // Don't return the actual token values for security
      const safeTokens = tokens.map(token => ({
        ...token,
        token_value: token.token_value ? '***' + token.token_value.slice(-4) : null
      }));

      res.json({
        success: true,
        data: { tokens: safeTokens }
      });
    } catch (error: unknown) {
      console.error('Get all API tokens error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch API tokens'
      });
    }
  }

  /**
   * Get API token by ID (admin only)
   */
  static async getTokenById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      // Don't return the actual token value for security
      const safeToken = {
        ...token,
        token_value: token.token_value ? '***' + token.token_value.slice(-4) : null
      };

      res.json({
        success: true,
        data: { token: safeToken }
      });
    } catch (error: unknown) {
      console.error('Get API token by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch API token'
      });
    }
  }

  /**
   * Create new API token (admin only)
   */
  static async createToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        display_name,
        description,
        provider,
        token_value,
        metadata
      } = req.body;

      // Validate required fields
      if (!name || !display_name || !provider || !token_value) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, display_name, provider, token_value'
        });
        return;
      }

      const apiTokenRepository = AppDataSource.getRepository(APIToken);

      // Check if token name already exists
      const existingToken = await apiTokenRepository.findOne({
        where: { name }
      });

      if (existingToken) {
        res.status(400).json({
          success: false,
          message: 'API token with this name already exists'
        });
        return;
      }

      // If this is set as default, unset other defaults
      if (req.body.is_default) {
        await apiTokenRepository.update(
          { is_default: true },
          { is_default: false }
        );
      }

      const token = apiTokenRepository.create({
        name,
        display_name,
        description,
        provider,
        token_value: encrypt(token_value), // Encrypt the token
        metadata: metadata || {},
        is_active: req.body.is_active !== false,
        is_default: req.body.is_default || false,
        is_valid: false // Will be validated separately
      });

      await apiTokenRepository.save(token);

      // Don't return the actual token value
      const safeToken = {
        ...token,
        token_value: '***' + token_value.slice(-4)
      };

      res.status(201).json({
        success: true,
        message: 'API token created successfully',
        data: { token: safeToken }
      });
    } catch (error: unknown) {
      console.error('Create API token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create API token'
      });
    }
  }

  /**
   * Update API token (admin only)
   */
  static async updateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      // If this is set as default, unset other defaults
      if (req.body.is_default) {
        await apiTokenRepository.update(
          { is_default: true },
          { is_default: false }
        );
      }

      // Encrypt token value if provided
      if (req.body.token_value) {
        req.body.token_value = encrypt(req.body.token_value);
        req.body.is_valid = false; // Reset validation status when token changes
      }

      // Update token
      Object.assign(token, req.body);
      await apiTokenRepository.save(token);

      // Don't return the actual token value
      const safeToken = {
        ...token,
        token_value: token.token_value ? '***' + token.token_value.slice(-4) : null
      };

      res.json({
        success: true,
        message: 'API token updated successfully',
        data: { token: safeToken }
      });
    } catch (error: unknown) {
      console.error('Update API token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update API token'
      });
    }
  }

  /**
   * Delete API token (admin only)
   */
  static async deleteToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      // Don't allow deleting the default token
      if (token.is_default) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete the default API token'
        });
        return;
      }

      await apiTokenRepository.remove(token);

      res.json({
        success: true,
        message: 'API token deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Delete API token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete API token'
      });
    }
  }

  /**
   * Toggle token status (admin only)
   */
  static async toggleTokenStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      // Don't allow deactivating the default token
      if (token.is_default && token.is_active) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate the default API token'
        });
        return;
      }

      token.is_active = !token.is_active;
      await apiTokenRepository.save(token);

      res.json({
        success: true,
        message: `API token ${token.is_active ? 'activated' : 'deactivated'} successfully`,
        data: { token }
      });
    } catch (error: unknown) {
      console.error('Toggle API token status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle API token status'
      });
    }
  }

  /**
   * Set default token (admin only)
   */
  static async setDefaultToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      if (!token.is_active) {
        res.status(400).json({
          success: false,
          message: 'Cannot set inactive token as default'
        });
        return;
      }

      // Unset current default
      await apiTokenRepository.update(
        { is_default: true },
        { is_default: false }
      );

      // Set new default
      token.is_default = true;
      await apiTokenRepository.save(token);

      res.json({
        success: true,
        message: 'Default API token updated successfully',
        data: { token }
      });
    } catch (error: unknown) {
      console.error('Set default API token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set default API token'
      });
    }
  }

  /**
   * Validate API token (admin only)
   */
  static async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      const token = await apiTokenRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!token) {
        res.status(404).json({
          success: false,
          message: 'API token not found'
        });
        return;
      }

      // Decrypt the token
      const decryptedToken = decrypt(token.token_value);

      // Test the token with Hugging Face API
      let isValid = false;
      let errorMessage = '';

      try {
        const response = await axios.post('https://router.huggingface.co/v1/chat/completions', {
          model: 'meta-llama/Meta-Llama-3-8B-Instruct:novita',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        }, {
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        isValid = response.status === 200;
      } catch (error: any) {
        isValid = false;
        errorMessage = error.response?.data?.error || (error instanceof Error ? error.message : String(error)) || 'Unknown error';
      }

      // Update token validation status
      token.is_valid = isValid;
      token.last_validated_at = new Date();
      await apiTokenRepository.save(token);

      res.json({
        success: true,
        message: isValid ? 'API token is valid' : 'API token validation failed',
        data: {
          isValid,
          errorMessage: errorMessage || null,
          lastValidatedAt: token.last_validated_at
        }
      });
    } catch (error: unknown) {
      console.error('Validate API token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate API token'
      });
    }
  }

  /**
   * Get active token for a provider (internal use)
   * First tries to get default token, then falls back to any active token
   */
  static async getActiveToken(provider: string): Promise<string | null> {
    try {
      const apiTokenRepository = AppDataSource.getRepository(APIToken);
      
      // First try to get default active token
      let token = await apiTokenRepository.findOne({
        where: { provider, is_active: true, is_default: true },
        order: { is_default: 'DESC' }
      });

      // If no default token, get any active token
      if (!token) {
        token = await apiTokenRepository.findOne({
          where: { provider, is_active: true },
          order: { is_default: 'DESC', created_at: 'DESC' }
      });
      }

      if (!token) {
        console.error(`No active API token found for provider: ${provider}`);
        return null;
      }

      const decryptedToken = decrypt(token.token_value);
      console.log(`✅ Retrieved API token for provider: ${provider}, token ID: ${token.id}, is_default: ${token.is_default}`);
      return decryptedToken;
    } catch (error: unknown) {
      console.error('Get active token error:', error);
      return null;
    }
  }
}
