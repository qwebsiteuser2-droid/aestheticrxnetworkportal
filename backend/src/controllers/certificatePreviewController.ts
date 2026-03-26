import { Request, Response } from 'express';
import { CertificateService } from '../services/certificateService';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';

export class CertificatePreviewController {
  /**
   * Generate certificate preview PDF
   */
  static async generatePreview(req: Request, res: Response): Promise<void> {
    try {
      const { doctor, tier } = req.body;

      if (!doctor || !tier) {
        res.status(400).json({
          success: false,
          message: 'Doctor and tier data are required'
        });
        return;
      }

      // Create mock doctor and tier objects
      const mockDoctor: any = {
        doctor_id: doctor.doctor_id || doctor.id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        email: doctor.email,
        phone: (doctor as any).phone || '',
        address: doctor.address || '',
        specialization: doctor.specialization || '',
        experience_years: doctor.experience_years || 0,
        qualifications: doctor.qualifications || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockTier: any = {
        id: tier.id,
        name: tier.name,
        min_sales: (tier as any).min_sales || tier.threshold,
        max_sales: tier.max_sales,
        color: tier.color,
        icon: tier.icon,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Generate certificate PDF
      const certificateBuffer = await CertificateService.generateCertificate(
        mockDoctor,
        mockTier,
        new Date()
      );

      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="certificate-preview.pdf"');
      res.setHeader('Content-Length', certificateBuffer.length);

      // Send PDF buffer
      res.send(certificateBuffer);

      console.log(`✅ Certificate preview generated for ${mockDoctor.doctor_name} - ${mockTier.name}`);
    } catch (error: unknown) {
      console.error('❌ Error generating certificate preview:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating certificate preview',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }

  /**
   * Send test certificate email
   */
  static async sendTestCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { doctor, tier } = req.body;

      if (!doctor || !tier) {
        res.status(400).json({
          success: false,
          message: 'Doctor and tier data are required'
        });
        return;
      }

      // Create mock doctor and tier objects
      const mockDoctor: any = {
        doctor_id: doctor.doctor_id || doctor.id,
        doctor_name: doctor.doctor_name,
        clinic_name: doctor.clinic_name,
        email: doctor.email,
        phone: (doctor as any).phone || '',
        address: doctor.address || '',
        specialization: doctor.specialization || '',
        experience_years: doctor.experience_years || 0,
        qualifications: doctor.qualifications || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockTier: any = {
        id: tier.id,
        name: tier.name,
        min_sales: (tier as any).min_sales || tier.threshold,
        max_sales: tier.max_sales,
        color: tier.color,
        icon: tier.icon,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Send test certificate to admin email instead of doctor's email
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      
      // Create a test doctor object with admin email
      const testDoctor = {
        ...mockDoctor,
        email: adminEmail
      };

      await CertificateService.sendCertificate(
        testDoctor as any,
        mockTier,
        new Date(),
        false // Not a multiple tier achievement
      );

      res.json({
        success: true,
        message: `Test certificate sent successfully to admin email (${adminEmail})`,
        data: {
          doctor: mockDoctor.doctor_name,
          tier: mockTier.name,
          testEmail: adminEmail,
          note: 'Test email sent to admin for verification'
        }
      });

      console.log(`✅ Test certificate sent to ${mockDoctor.doctor_name} (${mockDoctor.email}) for ${mockTier.name} tier`);
    } catch (error: unknown) {
      console.error('❌ Error sending test certificate:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending test certificate',
        error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error'
      });
    }
  }
}
