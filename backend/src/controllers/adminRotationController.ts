import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AdvertisementRotationConfig } from '../models/AdvertisementRotationConfig';

export class AdminRotationController {
  private rotationConfigRepository = AppDataSource.getRepository(AdvertisementRotationConfig);

  async getAllRotationConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await this.rotationConfigRepository.find({
        order: { area_name: 'ASC' }
      });

      res.json({
        success: true,
        data: configs
      });
    } catch (error: unknown) {
      console.error('Error fetching rotation configs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching rotation configurations'
      });
    }
  }

  async getRotationConfigByArea(req: Request, res: Response): Promise<void> {
    try {
      const { areaName } = req.params;
      
      // Check if table exists first
      const tableExists = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'advertisement_rotation_configs'
        )
      `);
      
      if (!tableExists[0]?.exists) {
        // Table doesn't exist yet - return default config
        res.json({
          success: true,
          data: {
            area_name: areaName,
            rotation_interval_seconds: 5,
            max_concurrent_ads: 1,
            auto_rotation_enabled: true,
            is_active: true
          }
        });
        return;
      }
      
      let config = await this.rotationConfigRepository.findOne({
        where: { area_name: areaName }
      });

      // If config doesn't exist, create a default one automatically
      if (!config) {
        console.log(`📝 Creating default rotation config for area: ${areaName}`);
        config = this.rotationConfigRepository.create({
          area_name: areaName,
          rotation_interval_seconds: 5, // Default 5 seconds
          max_concurrent_ads: 1, // Default to 1
          auto_rotation_enabled: true, // Enable rotation by default
          is_active: true
        });
        await this.rotationConfigRepository.save(config);
        console.log(`✅ Created default rotation config for area: ${areaName}`);
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error: unknown) {
      console.error('Error fetching rotation config:', error);
      // Return default config instead of error
      res.json({
        success: true,
        data: {
          area_name: req.params.areaName,
          rotation_interval_seconds: 5,
          max_concurrent_ads: 1,
          auto_rotation_enabled: true,
          is_active: true
        }
      });
    }
  }

  async updateRotationConfig(req: Request, res: Response): Promise<void> {
    try {
      const { areaName } = req.params;
      const { rotation_interval_seconds, max_concurrent_ads, auto_rotation_enabled, is_active, admin_notes } = req.body;

      const config = await this.rotationConfigRepository.findOne({
        where: { area_name: areaName }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Rotation configuration not found'
        });
        return;
      }

      // Update fields
      if (rotation_interval_seconds !== undefined) config.rotation_interval_seconds = rotation_interval_seconds;
      if (max_concurrent_ads !== undefined) config.max_concurrent_ads = max_concurrent_ads;
      if (auto_rotation_enabled !== undefined) config.auto_rotation_enabled = auto_rotation_enabled;
      if (is_active !== undefined) config.is_active = is_active;
      if (admin_notes !== undefined) config.admin_notes = admin_notes;

      await this.rotationConfigRepository.save(config);

      res.json({
        success: true,
        message: 'Rotation configuration updated successfully',
        data: config
      });
    } catch (error: unknown) {
      console.error('Error updating rotation config:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating rotation configuration'
      });
    }
  }

  async createRotationConfig(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, rotation_interval_seconds, max_concurrent_ads, auto_rotation_enabled, is_active, admin_notes } = req.body;

      const existingConfig = await this.rotationConfigRepository.findOne({
        where: { area_name }
      });

      if (existingConfig) {
        res.status(400).json({
          success: false,
          message: 'Rotation configuration for this area already exists'
        });
        return;
      }

      const config = this.rotationConfigRepository.create({
        area_name,
        rotation_interval_seconds: rotation_interval_seconds || 5,
        max_concurrent_ads: max_concurrent_ads || 1,
        auto_rotation_enabled: auto_rotation_enabled !== undefined ? auto_rotation_enabled : true,
        is_active: is_active !== undefined ? is_active : true,
        admin_notes
      });

      await this.rotationConfigRepository.save(config);

      res.json({
        success: true,
        message: 'Rotation configuration created successfully',
        data: config
      });
    } catch (error: unknown) {
      console.error('Error creating rotation config:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating rotation configuration'
      });
    }
  }

  async deleteRotationConfig(req: Request, res: Response): Promise<void> {
    try {
      const { areaName } = req.params;

      const config = await this.rotationConfigRepository.findOne({
        where: { area_name: areaName }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Rotation configuration not found'
        });
        return;
      }

      await this.rotationConfigRepository.remove(config);

      res.json({
        success: true,
        message: 'Rotation configuration deleted successfully'
      });
    } catch (error: unknown) {
      console.error('Error deleting rotation config:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting rotation configuration'
      });
    }
  }
}
