import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Doctor } from '../models/Doctor';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { ResearchPaper } from '../models/ResearchPaper';
import { ResearchPaperView } from '../models/ResearchPaperView';
import { ResearchPaperUpvote } from '../models/ResearchPaperUpvote';
import { ResearchBenefit } from '../models/ResearchBenefit';
import { ResearchBenefitConfig } from '../models/ResearchBenefitConfig';
import { ResearchRewardEligibility } from '../models/ResearchRewardEligibility';
import { AdminPermission } from '../models/AdminPermission';
import { ResearchReport } from '../models/ResearchReport';
import { ResearchSettings } from '../models/ResearchSettings';
import { Notification } from '../models/Notification';
import { LeaderboardSnapshot } from '../models/LeaderboardSnapshot';
import { AllowedSignupId } from '../models/AllowedSignupId';
import { HallOfPride } from '../models/HallOfPride';
import { TierConfig } from '../models/TierConfig';
import { PayFastITN } from '../models/PayFastITN';
import { OTP } from '../entities/OTP';
import { Team } from '../entities/Team';
import { TeamMember } from '../entities/TeamMember';
import { TeamInvitation } from '../entities/TeamInvitation';
import { TeamTierConfig } from '../entities/TeamTierConfig';
import { AwardMessageTemplate } from '../entities/AwardMessageTemplate';
import { Advertisement } from '../entities/Advertisement';
import { AdvertisementPlacement } from '../entities/AdvertisementPlacement';
import { AdvertisementApplication } from '../entities/AdvertisementApplication';
import { AIModel } from '../entities/AIModel';
import { APIToken } from '../entities/APIToken';
import { Certificate } from '../models/Certificate';
import { Badge } from '../models/Badge';
import { DebtThreshold } from '../models/DebtThreshold';
import { VideoAdvertisement } from '../models/VideoAdvertisement';
import { AdvertisementAreaConfig } from '../models/AdvertisementAreaConfig';
import { AdvertisementRotationConfig } from '../models/AdvertisementRotationConfig';
import { AutoEmailConfig } from '../models/AutoEmailConfig';
import { EmailDelivery } from '../models/EmailDelivery';
import { AdvertisementPricingConfig } from '../models/AdvertisementPricingConfig';
import { OTPConfig } from '../models/OTPConfig';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { FeaturedItem } from '../models/FeaturedItem';
// import { Advertisement } from '../models/Advertisement';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/aestheticrx1',
  entities: [
    Doctor,
    Product,
    Order,
    ResearchPaper,
    ResearchPaperView,
    ResearchPaperUpvote,
    ResearchBenefit,
    ResearchBenefitConfig,
    ResearchRewardEligibility,
    AdminPermission,
    ResearchReport,
    ResearchSettings,
    Notification,
    LeaderboardSnapshot,
    AllowedSignupId,
    HallOfPride,
    TierConfig,
    PayFastITN,
    OTP,
    Team,
    TeamMember,
    TeamInvitation,
    TeamTierConfig,
    AwardMessageTemplate,
    Advertisement,
    AdvertisementPlacement,
    AdvertisementApplication,
    AIModel,
    APIToken,
    Certificate,
    Badge,
    DebtThreshold,
    VideoAdvertisement,
    AdvertisementAreaConfig,
    AdvertisementRotationConfig,
    AutoEmailConfig,
    EmailDelivery,
    AdvertisementPricingConfig,
    OTPConfig,
    Conversation,
    Message,
    FeaturedItem,
    // Advertisement,
  ],
  migrations: process.env.NODE_ENV === 'production' || process.env.CI 
    ? ['dist/db/migrations/*.js'] 
    : ['src/db/migrations/*.ts'],
  synchronize: false, // Disabled to prevent constraint issues
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10 seconds for Railway network latency
    query_timeout: 30000, // 30 seconds for query timeout
    statement_timeout: 30000, // 30 seconds for statement timeout
  },
});

// Initialize the data source
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      console.log('🔄 Initializing database connection...');
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'configured' : 'using default'}`);
      console.log(`📦 Entities count: ${AppDataSource.options.entities?.length || 0}`);
      
      await AppDataSource.initialize();
      console.log('✅ Database connection established successfully');
    }
  } catch (error: unknown) {
    console.error('❌ Error during database initialization:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // In test/CI environments, provide more helpful error message
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      console.error('💡 Tip: This error often occurs due to:');
      console.error('   1. Entity file syntax errors');
      console.error('   2. Missing entity imports');
      console.error('   3. TypeORM version compatibility issues');
      console.error('   4. Module resolution problems');
    }
    throw error;
  }
};

// Close the data source
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed successfully');
    }
  } catch (error: unknown) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};
