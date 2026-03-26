import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { Certificate } from '../models/Certificate';
import { CertificateService } from '../services/certificateService';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Helper function to determine tier color from tier name
 */
const getTierColorFromName = (tierName: string): string => {
  const tierColorMap: { [key: string]: string } = {
    'Lead Starter': 'gray',
    'Lead Contributor': 'green',
    'Expert Contributor': 'blue',
    'Elite Lead': 'red',
    'Grand Lead': 'purple',
    'Diamond Lead': 'cyan',
    'Platinum Lead': 'indigo',
    'Master Lead': 'yellow',
    'Legendary Lead': 'orange',
    'Ultimate Lead': 'pink'
  };
  return tierColorMap[tierName] || 'blue';
};

/**
 * Send certificate to a specific doctor for a specific tier (admin only)
 */
export const sendCertificateToDoctor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { doctorId, tierName } = req.body;

    if (!doctorId || !tierName) {
      res.status(400).json({
        success: false,
        message: 'Doctor ID and tier name are required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get doctor
    const doctor = await doctorRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    // Get tier configuration
    const tier = await tierRepository.findOne({ where: { name: tierName, is_active: true } });
    if (!tier) {
      res.status(404).json({
        success: false,
        message: 'Tier configuration not found'
      });
      return;
    }

    // Send certificate
    await CertificateService.sendCertificate(doctor, tier);

    res.json({
      success: true,
      message: `Certificate sent successfully to ${doctor.doctor_name} for ${tier.name} tier`
    });
  } catch (error: unknown) {
    console.error('Error sending certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send certificate'
    });
  }
};

/**
 * Send certificates to all doctors who have achieved specific tiers (admin only)
 */
export const sendCertificatesToAllDoctors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { tierName } = req.body;

    if (!tierName) {
      res.status(400).json({
        success: false,
        message: 'Tier name is required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get tier configuration
    const tier = await tierRepository.findOne({ where: { name: tierName, is_active: true } });
    if (!tier) {
      res.status(404).json({
        success: false,
        message: 'Tier configuration not found'
      });
      return;
    }

    // Get all doctors with this tier
    const doctors = await doctorRepository.find({
      where: { 
        tier: tierName,
        is_approved: true,
        is_deactivated: false
      }
    });

    if (doctors.length === 0) {
      res.json({
        success: true,
        message: `No doctors found with ${tierName} tier`,
        certificatesSent: 0
      });
      return;
    }

    // Send certificates to all doctors
    let successCount = 0;
    let errorCount = 0;

    for (const doctor of doctors) {
      try {
        await CertificateService.sendCertificate(doctor, tier);
        successCount++;
        console.log(`✅ Certificate sent to ${doctor.doctor_name}`);
      } catch (error: unknown) {
        errorCount++;
        console.error(`❌ Failed to send certificate to ${doctor.doctor_name}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Certificates sent to ${successCount} doctors for ${tierName} tier`,
      certificatesSent: successCount,
      errors: errorCount
    });
  } catch (error: unknown) {
    console.error('Error sending certificates to all doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send certificates'
    });
  }
};

/**
 * Backfill certificates for all existing users who have achieved tiers (admin only)
 */
export const backfillCertificates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const certificateRepository = AppDataSource.getRepository(Certificate);

    // Get all active tier configurations
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    if (tiers.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No active tier configurations found'
      });
      return;
    }

    // Get all approved doctors
    const doctors = await doctorRepository.find({
      where: { 
        is_approved: true,
        is_deactivated: false,
        user_type: 'doctor'
      }
    });

    if (doctors.length === 0) {
      res.json({
        success: true,
        message: 'No doctors found',
        certificatesCreated: 0
      });
      return;
    }

    let certificatesCreated = 0;
    let certificatesUpdated = 0;
    let errors = 0;

    // Process each doctor
    for (const doctor of doctors) {
      try {
        // Find the tier config for this doctor's current tier
        const doctorTier = tiers.find(t => t.name === doctor.tier);
        
        if (!doctorTier) {
          console.log(`⚠️ No tier config found for ${doctor.doctor_name} with tier: ${doctor.tier}`);
          continue;
        }

        // Check if certificate already exists
        const existingCertificate = await certificateRepository.findOne({
          where: {
            doctor_id: doctor.id,
            certificate_type: 'tier_achievement',
            tier_name: doctor.tier
          }
        });

        if (existingCertificate && existingCertificate.certificate_url) {
          // Certificate already exists with URL, skip
          console.log(`⏭️ Certificate already exists for ${doctor.doctor_name} - ${doctor.tier}`);
          continue;
        }

        // Generate and save certificate
        await CertificateService.sendCertificate(
          doctor, 
          doctorTier, 
          doctor.approved_at || doctor.created_at || new Date()
        );

        if (existingCertificate) {
          certificatesUpdated++;
        } else {
          certificatesCreated++;
        }

        console.log(`✅ Certificate ${existingCertificate ? 'updated' : 'created'} for ${doctor.doctor_name} - ${doctor.tier}`);
        
        // Add small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: unknown) {
        errors++;
        console.error(`❌ Failed to create certificate for ${doctor.doctor_name}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Backfill completed: ${certificatesCreated} created, ${certificatesUpdated} updated, ${errors} errors`,
      certificatesCreated,
      certificatesUpdated,
      errors,
      totalProcessed: doctors.length
    });
  } catch (error: unknown) {
    console.error('Error backfilling certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backfill certificates'
    });
  }
};

/**
 * Generate certificate for current user's tier (user can call this)
 */
export const generateMyCertificate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    console.log('🔍 generateMyCertificate called by user:', user?.id, user?.email);
    
    if (!user) {
      console.error('❌ No user in request');
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);
    const certificateRepository = AppDataSource.getRepository(Certificate);

    // Get doctor with current tier
    const doctor = await doctorRepository.findOne({ where: { id: user.id } });
    if (!doctor) {
      console.error('❌ Doctor not found for user:', user.id);
      res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
      return;
    }

    console.log('✅ Doctor found:', doctor.doctor_name, 'Tier:', doctor.tier);

    // Get tier configuration
    const tier = await tierRepository.findOne({ where: { name: doctor.tier, is_active: true } });
    if (!tier) {
      console.error('❌ Tier config not found for:', doctor.tier);
      res.status(404).json({
        success: false,
        message: `Tier configuration not found for: ${doctor.tier}`
      });
      return;
    }

    console.log('✅ Tier config found:', tier.name);

    // Check if certificate already exists
    const existingCertificate = await certificateRepository.findOne({
      where: {
        doctor_id: doctor.id,
        certificate_type: 'tier_achievement',
        tier_name: doctor.tier
      }
    });

    if (existingCertificate && existingCertificate.certificate_url) {
      console.log('⏭️ Certificate already exists with URL');
      res.json({
        success: true,
        message: 'Certificate already exists',
        certificate: existingCertificate
      });
      return;
    }

    console.log('🔄 Generating new certificate...');
    // Generate certificate
    await CertificateService.sendCertificate(
      doctor, 
      tier, 
      doctor.approved_at || doctor.created_at || new Date()
    );

    console.log('✅ Certificate generated successfully');
    res.json({
      success: true,
      message: `Certificate generated successfully for ${doctor.tier} tier`
    });
  } catch (error: unknown) {
    console.error('❌ Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get certificate statistics (admin only)
 */
export const getCertificateStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user!;
    if (!admin.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Get all active tiers
    const tiers = await tierRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' }
    });

    // Get doctor counts by tier
    const tierStats = await Promise.all(
      tiers.map(async (tier) => {
        const count = await doctorRepository.count({
          where: { 
            tier: tier.name,
            is_approved: true,
            is_deactivated: false
          }
        });
        return {
          tierName: tier.name,
          doctorCount: count,
          threshold: tier.threshold
        };
      })
    );

    // Get total approved doctors
    const totalDoctors = await doctorRepository.count({
      where: { 
        is_approved: true,
        is_deactivated: false
      }
    });

    res.json({
      success: true,
      data: {
        totalDoctors,
        tierStats,
        totalTiers: tiers.length
      }
    });
  } catch (error: unknown) {
    console.error('Error getting certificate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate statistics'
    });
  }
};

/**
 * Download a certificate PDF by ID (regenerates if file doesn't exist)
 */
export const downloadCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificateId } = req.params;

    if (!certificateId) {
      res.status(400).json({
        success: false,
        message: 'Certificate ID is required'
      });
      return;
    }

    const certificateRepository = AppDataSource.getRepository(Certificate);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const tierRepository = AppDataSource.getRepository(TierConfig);

    // Find the certificate
    const certificate = await certificateRepository.findOne({
      where: { id: certificateId }
    });

    if (!certificate) {
      res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
      return;
    }

    // Get the doctor
    const doctor = await doctorRepository.findOne({
      where: { id: certificate.doctor_id }
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found for this certificate'
      });
      return;
    }

    // For tier achievement certificates, we need the tier config
    let pdfBuffer: Buffer;

    if (certificate.certificate_type === 'tier_achievement' && certificate.tier_name) {
      // Try to find the tier config (including inactive tiers)
      let tier = await tierRepository.findOne({
        where: { name: certificate.tier_name }
      });

      // If tier not found, create a fallback tier config based on certificate data
      if (!tier) {
        console.log(`⚠️ Tier config not found for "${certificate.tier_name}", using fallback`);
        // Create a minimal tier config for generating the certificate
        tier = {
          id: 'fallback',
          name: certificate.tier_name,
          color: getTierColorFromName(certificate.tier_name),
          threshold: 0,
          description: `${certificate.tier_name} Achievement`,
          benefits: '',
          icon: '🏆',
          display_order: 0,
          is_active: true,
          debt_limit: 0
        } as TierConfig;
      }

      // Generate the certificate PDF dynamically
      pdfBuffer = await CertificateService.generateCertificate(
        doctor,
        tier,
        certificate.issued_at || new Date()
      );
    } else {
      // For other certificate types, generate a generic certificate
      // Create a minimal tier config for non-tier certificates
      const genericTier = {
        name: certificate.achievement || certificate.title || 'Achievement',
        color: 'blue'
      } as TierConfig;

      pdfBuffer = await CertificateService.generateCertificate(
        doctor,
        genericTier,
        certificate.issued_at || new Date()
      );
    }

    // Set response headers for PDF download
    const safeFileName = `Certificate_${(certificate.tier_name || certificate.title || 'Achievement').replace(/[^a-zA-Z0-9]/g, '_')}_${doctor.doctor_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error: unknown) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
