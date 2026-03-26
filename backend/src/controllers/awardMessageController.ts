import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AwardMessageTemplate } from '../entities/AwardMessageTemplate';
import { AuthenticatedRequest } from '../types/auth';

export class AwardMessageController {
  /**
   * Get all award and message templates
   */
  static async getAllTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('getAllTemplates called by user:', req.user?.email, 'is_admin:', req.user?.is_admin);
      
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      const templates = await templateRepository.find({
        order: { template_type: 'ASC', template_name: 'ASC' }
      });

      console.log('Found templates:', templates.length);

      res.json({
        success: true,
        data: templates.map(template => template.toJSON())
      });
    } catch (error: unknown) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates'
      });
    }
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplateById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      const template = await templateRepository.findOne({ where: { id } });

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template'
      });
    }
  }

  /**
   * Create a new template
   */
  static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      
      // Check if template key already exists
      const existingTemplate = await templateRepository.findOne({
        where: { template_key: req.body.template_key }
      });

      if (existingTemplate) {
        res.status(400).json({
          success: false,
          message: 'Template key already exists'
        });
        return;
      }

      const template = templateRepository.create(req.body);
      const savedTemplate = await templateRepository.save(template);

      // Handle toJSON safely with proper type checking
      let templateData: any = null;
      if (Array.isArray(savedTemplate) && savedTemplate.length > 0) {
        const firstTemplate = savedTemplate[0];
        if (firstTemplate) {
          templateData = (firstTemplate as any).toJSON ? (firstTemplate as any).toJSON() : firstTemplate;
        }
      } else if (savedTemplate && !Array.isArray(savedTemplate)) {
        templateData = (savedTemplate as any).toJSON ? (savedTemplate as any).toJSON() : savedTemplate;
      }

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: templateData
      });
    } catch (error: unknown) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create template'
      });
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      
      const template = await templateRepository.findOne({ where: { id } });
      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
        return;
      }

      // Check if template key is being changed and if it already exists
      if (req.body.template_key && req.body.template_key !== template.template_key) {
        const existingTemplate = await templateRepository.findOne({
          where: { template_key: req.body.template_key }
        });

        if (existingTemplate) {
          res.status(400).json({
            success: false,
            message: 'Template key already exists'
          });
          return;
        }
      }

      // Update template
      Object.assign(template, req.body);
      const updatedTemplate = await templateRepository.save(template);

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: updatedTemplate.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update template'
      });
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      
      const template = await templateRepository.findOne({ where: { id } });
      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
        return;
      }

      await templateRepository.remove(template);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete template'
      });
    }
  }

  /**
   * Toggle template active status
   */
  static async toggleTemplateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      
      const template = await templateRepository.findOne({ where: { id } });
      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
        return;
      }

      template.is_active = !template.is_active;
      const updatedTemplate = await templateRepository.save(template);

      res.json({
        success: true,
        message: `Template ${updatedTemplate.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedTemplate.toJSON()
      });
    } catch (error: unknown) {
      console.error('Error toggling template status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle template status'
      });
    }
  }

  /**
   * Get template by key (for internal use)
   */
  static async getTemplateByKey(templateKey: string): Promise<AwardMessageTemplate | null> {
    try {
      const templateRepository = AppDataSource.getRepository(AwardMessageTemplate);
      return await templateRepository.findOne({
        where: { template_key: templateKey, is_active: true }
      });
    } catch (error: unknown) {
      console.error('Error fetching template by key:', error);
      return null;
    }
  }

  /**
   * Render template with variables
   */
  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    // Replace all {{variable}} placeholders with actual values
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, variables[key] || '');
    });

    return rendered;
  }
}
