import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AIModel } from '../entities/AIModel';
import { AuthenticatedRequest } from '../types/auth';

export class AIModelController {
  /**
   * Get all active AI models (public)
   */
  static async getActiveModels(req: Request, res: Response): Promise<void> {
    try {
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const models = await aiModelRepository.find({
        where: { is_active: true },
        order: { is_default: 'DESC', display_name: 'ASC' }
      });

      res.json({
        success: true,
        data: { models }
      });
    } catch (error: unknown) {
      console.error('Get active AI models error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI models'
      });
    }
  }

  /**
   * Get all AI models (admin only)
   */
  static async getAllModels(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const models = await aiModelRepository.find({
        order: { is_default: 'DESC', display_name: 'ASC' }
      });

      res.json({
        success: true,
        data: { models }
      });
    } catch (error: unknown) {
      console.error('Get all AI models error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI models'
      });
    }
  }

  /**
   * Get AI model by ID (admin only)
   */
  static async getModelById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const model = await aiModelRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!model) {
        res.status(404).json({
          success: false,
          message: 'AI model not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { model }
      });
    } catch (error: unknown) {
      console.error('Get AI model by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI model'
      });
    }
  }

  /**
   * Create new AI model (admin only)
   */
  static async createModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        display_name,
        description,
        model_id,
        max_tokens,
        temperature,
        max_requests_per_minute,
        provider,
        metadata
      } = req.body;

      // Validate required fields
      if (!name || !display_name || !model_id) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, display_name, model_id'
        });
        return;
      }

      const aiModelRepository = AppDataSource.getRepository(AIModel);

      // Check if model name already exists
      const existingModel = await aiModelRepository.findOne({
        where: { name }
      });

      if (existingModel) {
        res.status(400).json({
          success: false,
          message: 'AI model with this name already exists'
        });
        return;
      }

      // If this is set as default, unset other defaults
      if (req.body.is_default) {
        await aiModelRepository.update(
          { is_default: true },
          { is_default: false }
        );
      }

      const model = aiModelRepository.create({
        name,
        display_name,
        description,
        model_id,
        max_tokens: max_tokens || 2000,
        temperature: temperature || 0.7,
        max_requests_per_minute: max_requests_per_minute || 20,
        provider: provider || 'huggingface',
        metadata: metadata || {},
        is_active: req.body.is_active !== false,
        is_default: req.body.is_default || false
      });

      await aiModelRepository.save(model);

      res.status(201).json({
        success: true,
        message: 'AI model created successfully',
        data: { model }
      });
    } catch (error: unknown) {
      console.error('Create AI model error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create AI model'
      });
    }
  }

  /**
   * Update AI model (admin only)
   */
  static async updateModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const model = await aiModelRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!model) {
        res.status(404).json({
          success: false,
          message: 'AI model not found'
        });
        return;
      }

      // If this is set as default, unset other defaults
      if (req.body.is_default) {
        await aiModelRepository.update(
          { is_default: true },
          { is_default: false }
        );
      }

      // Update model
      Object.assign(model, req.body);
      await aiModelRepository.save(model);

      res.json({
        success: true,
        message: 'AI model updated successfully',
        data: { model }
      });
    } catch (error: unknown) {
      console.error('Update AI model error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update AI model'
      });
    }
  }

  /**
   * Delete AI model (admin only)
   */
  static async deleteModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const model = await aiModelRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!model) {
        res.status(404).json({
          success: false,
          message: 'AI model not found'
        });
        return;
      }

      // Don't allow deleting the default model
      if (model.is_default) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete the default AI model'
        });
        return;
      }

      await aiModelRepository.remove(model);

      res.json({
        success: true,
        message: 'AI model deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Delete AI model error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete AI model'
      });
    }
  }

  /**
   * Toggle model status (admin only)
   */
  static async toggleModelStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const model = await aiModelRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!model) {
        res.status(404).json({
          success: false,
          message: 'AI model not found'
        });
        return;
      }

      // Don't allow deactivating the default model
      if (model.is_default && model.is_active) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate the default AI model'
        });
        return;
      }

      model.is_active = !model.is_active;
      await aiModelRepository.save(model);

      res.json({
        success: true,
        message: `AI model ${model.is_active ? 'activated' : 'deactivated'} successfully`,
        data: { model }
      });
    } catch (error: unknown) {
      console.error('Toggle AI model status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle AI model status'
      });
    }
  }

  /**
   * Set default model (admin only)
   */
  static async setDefaultModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const aiModelRepository = AppDataSource.getRepository(AIModel);
      
      const model = await aiModelRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!model) {
        res.status(404).json({
          success: false,
          message: 'AI model not found'
        });
        return;
      }

      if (!model.is_active) {
        res.status(400).json({
          success: false,
          message: 'Cannot set inactive model as default'
        });
        return;
      }

      // Unset current default
      await aiModelRepository.update(
        { is_default: true },
        { is_default: false }
      );

      // Set new default
      model.is_default = true;
      await aiModelRepository.save(model);

      res.json({
        success: true,
        message: 'Default AI model updated successfully',
        data: { model }
      });
    } catch (error: unknown) {
      console.error('Set default AI model error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set default AI model'
      });
    }
  }
}
