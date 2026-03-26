import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AdvertisementPricingConfig, PlacementArea, AdvertisementType, DurationUnit } from '../models/AdvertisementPricingConfig';

export class AdvertisementPricingController {
  private get pricingConfigRepository() {
    return AppDataSource.getRepository(AdvertisementPricingConfig);
  }

  // Get all pricing configurations
  async getAllPricingConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await this.pricingConfigRepository.find({
        order: {
          placement_area: 'ASC',
          advertisement_type: 'ASC',
          duration_unit: 'ASC',
          is_quitable: 'ASC'
        }
      });

      res.json({
        success: true,
        data: configs
      });
    } catch (error: any) {
      console.error('Error fetching pricing configs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing configurations',
        error: error.message
      });
    }
  }

  // Get pricing config by ID
  async getPricingConfigById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const config = await this.pricingConfigRepository.findOne({
        where: { id }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Pricing configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('Error fetching pricing config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing configuration',
        error: error.message
      });
    }
  }

  // Create new pricing configuration
  async createPricingConfig(req: Request, res: Response): Promise<void> {
    try {
      const { placement_area, advertisement_type, duration_unit, is_quitable, unit_price, description, is_active } = req.body;

      // Validate required fields
      if (!placement_area || !advertisement_type || !duration_unit || unit_price === undefined) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: placement_area, advertisement_type, duration_unit, unit_price'
        });
        return;
      }

      // Check if configuration already exists
      const existing = await this.pricingConfigRepository.findOne({
        where: {
          placement_area,
          advertisement_type,
          duration_unit,
          is_quitable: is_quitable !== undefined ? is_quitable : true
        }
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'Pricing configuration already exists for this combination'
        });
        return;
      }

      const config = this.pricingConfigRepository.create({
        placement_area,
        advertisement_type,
        duration_unit,
        is_quitable: is_quitable !== undefined ? is_quitable : true,
        unit_price: parseFloat(unit_price),
        description: description || null,
        is_active: is_active !== undefined ? is_active : true
      });

      const savedConfig = await this.pricingConfigRepository.save(config);

      res.status(201).json({
        success: true,
        message: 'Pricing configuration created successfully',
        data: savedConfig
      });
    } catch (error: any) {
      console.error('Error creating pricing config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pricing configuration',
        error: error.message
      });
    }
  }

  // Update pricing configuration
  async updatePricingConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { unit_price, description, is_active } = req.body;

      const config = await this.pricingConfigRepository.findOne({
        where: { id }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Pricing configuration not found'
        });
        return;
      }

      if (unit_price !== undefined) {
        config.unit_price = parseFloat(unit_price);
      }
      if (description !== undefined) {
        config.description = description;
      }
      if (is_active !== undefined) {
        config.is_active = is_active;
      }

      const updatedConfig = await this.pricingConfigRepository.save(config);

      res.json({
        success: true,
        message: 'Pricing configuration updated successfully',
        data: updatedConfig
      });
    } catch (error: any) {
      console.error('Error updating pricing config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update pricing configuration',
        error: error.message
      });
    }
  }

  // Delete pricing configuration
  async deletePricingConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const config = await this.pricingConfigRepository.findOne({
        where: { id }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Pricing configuration not found'
        });
        return;
      }

      await this.pricingConfigRepository.remove(config);

      res.json({
        success: true,
        message: 'Pricing configuration deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting pricing config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete pricing configuration',
        error: error.message
      });
    }
  }

  // Get pricing for specific combination (for calculation)
  async getPricingForCombination(req: Request, res: Response): Promise<void> {
    try {
      const { placement_area, advertisement_type, duration_unit, is_quitable } = req.query;

      if (!placement_area || !advertisement_type || !duration_unit) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters: placement_area, advertisement_type, duration_unit'
        });
        return;
      }

      const config = await this.pricingConfigRepository.findOne({
        where: {
          placement_area: placement_area as PlacementArea,
          advertisement_type: advertisement_type as AdvertisementType,
          duration_unit: duration_unit as DurationUnit,
          is_quitable: is_quitable === 'false' ? false : true,
          is_active: true
        }
      });

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Pricing configuration not found for this combination'
        });
        return;
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('Error fetching pricing for combination:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing',
        error: error.message
      });
    }
  }
}

