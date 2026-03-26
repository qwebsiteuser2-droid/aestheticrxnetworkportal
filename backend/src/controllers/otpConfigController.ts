import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { OTPConfig } from '../models/OTPConfig';

// Create table if it doesn't exist (fallback if migration hasn't run)
async function ensureTableExists(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    const tableExists = await queryRunner.hasTable('otp_configs');
    
    if (!tableExists) {
      console.log('⚠️ OTP configs table does not exist. Creating it...');
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS otp_configs (
          "userType" VARCHAR(50) PRIMARY KEY,
          duration INTEGER NOT NULL DEFAULT 24,
          "durationType" VARCHAR(20) NOT NULL DEFAULT 'hours',
          "isRequired" BOOLEAN NOT NULL DEFAULT false,
          description TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Created otp_configs table');
      
      // Insert default configs
      await queryRunner.query(`
        INSERT INTO otp_configs ("userType", duration, "durationType", "isRequired", description, created_at, updated_at)
        VALUES 
          ('regular', 24, 'hours', true, 'OTP required for regular users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('admin', 1, 'hours', true, 'OTP required for every admin login', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("userType") DO NOTHING;
      `);
      console.log('✅ Inserted default OTP configs');
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error);
    throw error; // Re-throw so caller knows it failed
  } finally {
    await queryRunner.release();
  }
}

// Initialize default configs if they don't exist
async function ensureDefaultConfigs(): Promise<void> {
  try {
    console.log('🔍 ensureDefaultConfigs - Starting');
    // FIRST: Ensure table exists before any queries
    await ensureTableExists();
    console.log('🔍 ensureDefaultConfigs - Table exists');
    
    const configRepository = AppDataSource.getRepository(OTPConfig);
    console.log('🔍 ensureDefaultConfigs - Repository created');
    
    try {
      const regularConfig = await configRepository.findOne({ where: { userType: 'regular' } });
      console.log(`🔍 ensureDefaultConfigs - Regular config query result: ${regularConfig ? 'found' : 'not found'}`, regularConfig ? { userType: regularConfig.userType, isRequired: regularConfig.isRequired, duration: regularConfig.duration } : null);
      
      if (!regularConfig) {
        console.log('🔍 ensureDefaultConfigs - Creating default regular config');
        const defaultRegular = configRepository.create({
          userType: 'regular',
          duration: 24,
          durationType: 'hours',
          isRequired: true,
          description: 'OTP required for regular users'
        });
        await configRepository.save(defaultRegular);
        console.log('✅ Created default OTP config for regular users');
      }
    } catch (error) {
      console.error('❌ Error checking/creating regular config:', error);
      throw error;
    }

    try {
      const adminConfig = await configRepository.findOne({ where: { userType: 'admin' } });
      console.log(`🔍 ensureDefaultConfigs - Admin config query result: ${adminConfig ? 'found' : 'not found'}`, adminConfig ? { userType: adminConfig.userType, isRequired: adminConfig.isRequired, duration: adminConfig.duration } : null);

      if (!adminConfig) {
        console.log('🔍 ensureDefaultConfigs - Creating default admin config');
        const defaultAdmin = configRepository.create({
          userType: 'admin',
          duration: 1,
          durationType: 'hours',
          isRequired: true,
          description: 'OTP required for every admin login'
        });
        await configRepository.save(defaultAdmin);
        console.log('✅ Created default OTP config for admin users');
      }
    } catch (error) {
      console.error('❌ Error checking/creating admin config:', error);
      throw error;
    }
    
    console.log('✅ ensureDefaultConfigs - Completed successfully');
  } catch (error) {
    console.error('❌ Error in ensureDefaultConfigs:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error; // Re-throw so caller knows it failed
  }
}

export const getOTPConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if table exists, if not return default configs
    try {
      await ensureDefaultConfigs();
      
      const configRepository = AppDataSource.getRepository(OTPConfig);
      const configs = await configRepository.find({
        order: { userType: 'ASC' }
      });

      res.status(200).json({
        success: true,
        data: configs
      });
    } catch (dbError: unknown) {
      // If table doesn't exist, return default configs
      if (dbError instanceof Error && dbError.message.includes('does not exist')) {
        console.warn('⚠️ OTP configs table does not exist yet. Returning default configs. Run migrations to create the table.');
        const defaultConfigs = [
          {
            userType: 'regular',
            duration: 24,
            durationType: 'hours',
            isRequired: true,
            description: 'OTP required for regular users'
          },
          {
            userType: 'admin',
            duration: 1,
            durationType: 'hours',
            isRequired: true,
            description: 'OTP required for every admin login'
          }
        ];
        res.status(200).json({
          success: true,
          data: defaultConfigs,
          warning: 'Using default configs. Table not created yet. Run migrations.'
        });
      } else {
        throw dbError;
      }
    }
  } catch (error: unknown) {
    console.error('Error getting OTP configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OTP configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateOTPConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { configs }: { configs: OTPConfig[] } = req.body;

    // Validate the configurations
    if (!Array.isArray(configs) || configs.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid configurations provided'
      });
      return;
    }

    // Validate each configuration
    for (const config of configs) {
      if (!config.userType || !['regular', 'admin'].includes(config.userType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user type in configuration'
        });
        return;
      }

      if (typeof config.isRequired !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isRequired must be a boolean value'
        });
        return;
      }

      if (config.isRequired && (typeof config.duration !== 'number' || config.duration <= 0)) {
        res.status(400).json({
          success: false,
          message: 'Duration must be a positive number when OTP is required'
        });
        return;
      }
    }

    try {
      // FIRST: Ensure table exists before any queries
      await ensureTableExists();
      
      // Update configurations in database
      const configRepository = AppDataSource.getRepository(OTPConfig);
      
      for (const config of configs) {
        const existingConfig = await configRepository.findOne({ where: { userType: config.userType } });
        
        if (existingConfig) {
          // Update existing config
          existingConfig.duration = config.duration;
          existingConfig.durationType = config.durationType;
          existingConfig.isRequired = config.isRequired;
          existingConfig.description = config.description || null;
          await configRepository.save(existingConfig);
        } else {
          // Create new config
          const newConfig = configRepository.create({
            userType: config.userType,
            duration: config.duration,
            durationType: config.durationType,
            isRequired: config.isRequired,
            description: config.description || null
          });
          await configRepository.save(newConfig);
        }
      }

      // Fetch updated configs
      const updatedConfigs = await configRepository.find({
        order: { userType: 'ASC' }
      });

      console.log('✅ OTP configurations updated in database:', updatedConfigs);

      res.status(200).json({
        success: true,
        message: 'OTP configurations updated successfully',
        data: updatedConfigs
      });
    } catch (dbError: unknown) {
      // If table doesn't exist, return error with instructions
      if (dbError instanceof Error && dbError.message.includes('does not exist')) {
        console.error('❌ OTP configs table does not exist. Migration needs to run.');
        res.status(500).json({
          success: false,
          message: 'Database table does not exist. Please run migrations to create the otp_configs table.',
          error: 'Table otp_configs does not exist. Run: npm run migration:run'
        });
      } else {
        throw dbError;
      }
    }
  } catch (error: unknown) {
    console.error('❌ Error updating OTP configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update OTP configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to get OTP configuration for a user type (from database)
export const getOTPConfigForUserType = async (userType: 'regular' | 'admin'): Promise<OTPConfig | null> => {
  try {
    console.log(`🔍 getOTPConfigForUserType - Starting for userType: ${userType}`);
    await ensureTableExists();
    console.log(`🔍 getOTPConfigForUserType - Table exists, ensuring defaults`);
    await ensureDefaultConfigs();
    console.log(`🔍 getOTPConfigForUserType - Defaults ensured, querying database`);
    const configRepository = AppDataSource.getRepository(OTPConfig);
    const config = await configRepository.findOne({ where: { userType } });
    console.log(`🔍 getOTPConfigForUserType - Query result for ${userType}:`, config ? {
      userType: config.userType,
      isRequired: config.isRequired,
      duration: config.duration,
      durationType: config.durationType
    } : 'null');
    return config;
  } catch (error) {
    console.error(`❌ Error getting OTP config for user type ${userType}:`, error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Return default config if table doesn't exist
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log(`⚠️ Table doesn't exist, returning default config for ${userType}`);
      return userType === 'admin' 
        ? { userType: 'admin', duration: 1, durationType: 'hours', isRequired: true, description: 'OTP required for every admin login', created_at: new Date(), updated_at: new Date() } as OTPConfig
        : { userType: 'regular', duration: 24, durationType: 'hours', isRequired: true, description: 'OTP required for regular users', created_at: new Date(), updated_at: new Date() } as OTPConfig;
    }
    console.error(`❌ Returning null due to error for ${userType}`);
    return null;
  }
};

// Helper function to check if OTP is required for a user type (from database)
export const isOTPRequiredForUserType = async (userType: 'regular' | 'admin'): Promise<boolean> => {
  try {
    console.log(`🔍 isOTPRequiredForUserType - Starting for userType: ${userType}`);
    const config = await getOTPConfigForUserType(userType);
    const result = config ? config.isRequired : true; // Default to true for security
    console.log(`🔍 isOTPRequiredForUserType - Result for ${userType}: ${result} (config found: ${!!config}, isRequired: ${config?.isRequired})`);
    return result;
  } catch (error) {
    console.error(`❌ Error checking OTP requirement for ${userType}:`, error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log(`⚠️ Returning default true (require OTP) for ${userType} due to error`);
    return true; // Default to requiring OTP for security
  }
};

// Helper function to get OTP duration for a user type (in hours) - from database
export const getOTPDurationForUserType = async (userType: 'regular' | 'admin'): Promise<number> => {
  try {
    console.log(`🔍 getOTPDurationForUserType - Starting for userType: ${userType}`);
    const config = await getOTPConfigForUserType(userType);
    if (!config) {
      console.log(`🔍 getOTPDurationForUserType - Config not found for ${userType}, returning default 1 (Every Time)`);
      return 1; // Default to Every Time for security
    }
    if (!config.isRequired) {
      console.log(`🔍 getOTPDurationForUserType - OTP not required for ${userType}, returning 0`);
      return 0; // Not required
    }
    console.log(`🔍 getOTPDurationForUserType - Result for ${userType}: ${config.duration} hours`);
    return config.duration;
  } catch (error) {
    console.error(`❌ Error getting OTP duration for ${userType}:`, error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // IMPORTANT: Default to 1 (Every Time) for security if query fails
    console.log(`⚠️ Returning 1 (Every Time - secure default) for ${userType} due to error`);
    return 1;
  }
};
