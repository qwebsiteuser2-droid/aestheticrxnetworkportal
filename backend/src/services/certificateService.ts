import PDFDocument from 'pdfkit';
import { Doctor } from '../models/Doctor';
import { TierConfig } from '../models/TierConfig';
import { Certificate } from '../models/Certificate';
import { AppDataSource } from '../db/data-source';
import gmailService from './gmailService';
import fs from 'fs';
import path from 'path';

export class CertificateService {
  /**
   * Generate a PDF certificate for tier achievement
   */
  static async generateCertificate(
    doctor: Doctor,
    tier: TierConfig,
    achievementDate: Date = new Date()
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Professional background with subtle gradient effect
        doc.rect(0, 0, doc.page.width, doc.page.height)
          .fill('#fefefe');

        // Get tier-specific colors
        const tierColors = this.getTierColors(tier.color);

        // Enhanced decorative border with tier-specific styling
        doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50)
          .stroke(tierColors.primary)
          .lineWidth(3);

        doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70)
          .stroke(tierColors.secondary)
          .lineWidth(2);

        doc.rect(45, 45, doc.page.width - 90, doc.page.height - 90)
          .stroke(tierColors.light)
          .lineWidth(1);

        // Enhanced Header - Professional Certificate Title with tier colors
        doc.fontSize(36)
          .fill(tierColors.primary)
          .font('Helvetica-Bold')
          .text('CERTIFICATE OF ACHIEVEMENT', 0, 90, {
            align: 'center'
          });

        doc.fontSize(20)
          .fill(tierColors.secondary)
          .font('Helvetica-Oblique')
          .text('Community Contribution Recognition', 0, 130, {
            align: 'center'
          });

        // Add decorative line under title with tier color
        doc.strokeColor(tierColors.secondary)
          .lineWidth(2)
          .moveTo(doc.page.width/2 - 100, 150)
          .lineTo(doc.page.width/2 + 100, 150)
          .stroke();

        // Enhanced Main certificate content - optimized for single page
        doc.fontSize(20)
          .fill('#1f2937')
          .font('Helvetica')
          .text('This is to certify that', 0, 180, {
            align: 'center'
          });

        // Doctor's name with enhanced styling
        doc.fontSize(32)
          .fill('#dc2626')
          .font('Helvetica-Bold')
          .text(doctor.doctor_name, 0, 215, {
            align: 'center'
          });

        doc.fontSize(18)
          .fill('#4b5563')
          .font('Helvetica-Oblique')
          .text(`from ${doctor.clinic_name}`, 0, 250, {
            align: 'center'
          });

        // Achievement details with enhanced styling
        doc.fontSize(20)
          .fill('#1f2937')
          .font('Helvetica')
          .text('has successfully achieved the', 0, 300, {
            align: 'center'
          });

        // Tier name with enhanced icon and styling
        const tierIcon = this.getTierIcon(tier.name);
        doc.fontSize(28)
          .fill('#059669')
          .font('Helvetica-Bold')
          .text(`${tierIcon} ${tier.name}`, 0, 335, {
            align: 'center'
          });

        // Enhanced achievement description
        doc.fontSize(16)
          .fill('#6b7280')
          .font('Helvetica')
          .text('for outstanding contribution to our medical community', 0, 370, {
            align: 'center'
          });

        // Achievement date
        doc.fontSize(12)
          .fill('#9ca3af')
          .font('Helvetica')
          .text(`Achieved on: ${achievementDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`, 0, 400, {
            align: 'center'
          });

        // Professional signatures section with enhanced styling - adjusted for single page
        const signatureY = 480;
        const signatureWidth = 200;
        const signatureSpacing = 50;

        // Enhanced signature lines with more realistic styling
        // CEO signature line - adjusted to match new positioning
        doc.strokeColor('#2c3e50')
          .lineWidth(1.5)
          .moveTo(30, signatureY - 12)
          .lineTo(30 + signatureWidth, signatureY - 12)
          .stroke();
        
        // Add subtle dotted effect to simulate signature line
        doc.strokeColor('#6b7280')
          .lineWidth(0.5)
          .opacity(0.4)
          .moveTo(30, signatureY - 8)
          .lineTo(30 + signatureWidth, signatureY - 8)
          .stroke()
          .opacity(1);

        // President signature line - adjusted to match new positioning
        doc.strokeColor('#2c3e50')
          .lineWidth(1.5)
          .moveTo(doc.page.width - 290, signatureY - 12)
          .lineTo(doc.page.width - 290 + signatureWidth, signatureY - 12)
          .stroke();
        
        // Add subtle dotted effect to simulate signature line
        doc.strokeColor('#6b7280')
          .lineWidth(0.5)
          .opacity(0.4)
          .moveTo(doc.page.width - 290, signatureY - 8)
          .lineTo(doc.page.width - 290 + signatureWidth, signatureY - 8)
          .stroke()
          .opacity(1);

        // CEO Signature - positioned more to the left
        this.drawDigitalSignature(doc, 'Muhammad Qasim Shabbir', 30, signatureY + 8, signatureWidth, '#1a202c');
        
        doc.fontSize(12)
          .fill('#4a5568')
          .font('Helvetica-Oblique')
          .text('Chief Executive Officer', 30, signatureY + 28, {
            width: signatureWidth,
            align: 'center'
          });

        // Add decorative element under CEO signature
        doc.strokeColor('#e2e8f0')
          .lineWidth(1)
          .moveTo(30 + signatureWidth/2 - 20, signatureY + 48)
          .lineTo(30 + signatureWidth/2 + 20, signatureY + 48)
          .stroke();

        // President Signature - positioned more to the left
        this.drawDigitalSignature(doc, 'Muhammad Asim Shabbir', doc.page.width - 290, signatureY + 8, signatureWidth, '#1a202c');
        
        doc.fontSize(12)
          .fill('#4a5568')
          .font('Helvetica-Oblique')
          .text('President', doc.page.width - 290, signatureY + 28, {
            width: signatureWidth,
            align: 'center'
          });

        // Add decorative element under President signature
        doc.strokeColor('#e2e8f0')
          .lineWidth(1)
          .moveTo(doc.page.width - 290 + signatureWidth/2 - 20, signatureY + 48)
          .lineTo(doc.page.width - 290 + signatureWidth/2 + 20, signatureY + 48)
          .stroke();

        // Enhanced Footer with professional styling - adjusted for single page
        doc.fontSize(10)
          .fill('#6b7280')
          .font('Helvetica')
          .text('This certificate is digitally generated and verified', 0, doc.page.height - 60, {
            align: 'center'
          });

        doc.fontSize(9)
          .fill('#9ca3af')
          .font('Helvetica-Bold')
          .text(`Certificate ID: ${this.generateCertificateId(doctor, tier)}`, 0, doc.page.height - 45, {
            align: 'center'
          });

        // Add professional footer line
        doc.strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(doc.page.width/2 - 150, doc.page.height - 30)
          .lineTo(doc.page.width/2 + 150, doc.page.height - 30)
          .stroke();

        doc.fontSize(8)
          .fill('#9ca3af')
          .font('Helvetica-Oblique')
          .text('Digitally signed by: Muhammad Qasim Shabbir (CEO) & Muhammad Asim Shabbir (President)', 0, doc.page.height - 15, {
            align: 'center'
          });

        // Decorative elements
        this.addDecorativeElements(doc);

        doc.end();
      } catch (error: unknown) {
        reject(error);
      }
    });
  }

  /**
   * Get tier icon for certificate
   */
  private static getTierIcon(tierName: string): string {
    const tierIcons: { [key: string]: string } = {
      'Lead Starter': '🥉',
      'Lead Contributor': '🥈',
      'Lead Expert': '🥇',
      'Expert Contributor': '🥇',
      'Grand Lead': '🏆',
      'Elite Lead': '👑',
      'Diamond Lead': '💎',
      'Platinum Lead': '💠',
      'Master Lead': '🌟'
    };
    return tierIcons[tierName] || '🏅';
  }

  /**
   * Get tier-specific colors for certificate styling
   */
  private static getTierColors(tierColor: string): { primary: string; secondary: string; light: string } {
    const colorMap: { [key: string]: { primary: string; secondary: string; light: string } } = {
      'gray': {
        primary: '#6b7280',
        secondary: '#9ca3af',
        light: '#d1d5db'
      },
      'green': {
        primary: '#059669',
        secondary: '#10b981',
        light: '#6ee7b7'
      },
      'blue': {
        primary: '#2563eb',
        secondary: '#3b82f6',
        light: '#93c5fd'
      },
      'purple': {
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        light: '#c4b5fd'
      },
      'red': {
        primary: '#dc2626',
        secondary: '#ef4444',
        light: '#fca5a5'
      },
      'yellow': {
        primary: '#d97706',
        secondary: '#f59e0b',
        light: '#fde68a'
      },
      'orange': {
        primary: '#ea580c',
        secondary: '#f97316',
        light: '#fed7aa'
      },
      'pink': {
        primary: '#db2777',
        secondary: '#ec4899',
        light: '#f9a8d4'
      },
      'indigo': {
        primary: '#4338ca',
        secondary: '#6366f1',
        light: '#a5b4fc'
      },
      'teal': {
        primary: '#0d9488',
        secondary: '#14b8a6',
        light: '#5eead4'
      },
      'cyan': {
        primary: '#0891b2',
        secondary: '#06b6d4',
        light: '#67e8f9'
      },
      'lime': {
        primary: '#65a30d',
        secondary: '#84cc16',
        light: '#bef264'
      },
      'amber': {
        primary: '#d97706',
        secondary: '#f59e0b',
        light: '#fde68a'
      },
      'emerald': {
        primary: '#047857',
        secondary: '#10b981',
        light: '#6ee7b7'
      },
      'violet': {
        primary: '#7c2d12',
        secondary: '#8b5cf6',
        light: '#c4b5fd'
      },
      'rose': {
        primary: '#be185d',
        secondary: '#f43f5e',
        light: '#fda4af'
      },
      'sky': {
        primary: '#0284c7',
        secondary: '#0ea5e9',
        light: '#7dd3fc'
      },
      'slate': {
        primary: '#475569',
        secondary: '#64748b',
        light: '#94a3b8'
      },
      'zinc': {
        primary: '#52525b',
        secondary: '#71717a',
        light: '#a1a1aa'
      },
      'neutral': {
        primary: '#525252',
        secondary: '#737373',
        light: '#a3a3a3'
      },
      'stone': {
        primary: '#57534e',
        secondary: '#78716c',
        light: '#a8a29e'
      },
      '#F97316': { // Expert Contributor orange (legacy)
        primary: '#ea580c',
        secondary: '#f97316',
        light: '#fed7aa'
      }
    };

    return colorMap[tierColor] || colorMap['blue']!; // Default to blue if color not found
  }

  /**
   * Draw an authentic digital signature style
   */
  private static drawDigitalSignature(doc: any, name: string, x: number, y: number, width: number, color: string): void {
    const centerX = x + width / 2;
    
    // Draw the full name positioned correctly on the signature line
    doc.fontSize(15)
      .fill(color)
      .font('Helvetica-BoldOblique')
      .text(name, centerX, y, {
        align: 'center',
        width: width - 20, // Leave some margin
        lineGap: 0 // Prevent line wrapping
      });
    
    // Add a subtle digital signature underline with slight curve
    doc.strokeColor(color)
      .lineWidth(1.2)
      .opacity(0.6)
      .moveTo(x + 10, y + 15)
      .quadraticCurveTo(centerX, y + 18, x + width - 10, y + 15)
      .stroke()
      .opacity(1);
    
    // Add a subtle "digitally signed" effect with small dots
    doc.fillColor(color)
      .opacity(0.3)
      .circle(centerX - 12, y + 22, 0.4)
      .fill()
      .circle(centerX, y + 22, 0.4)
      .fill()
      .circle(centerX + 12, y + 22, 0.4)
      .fill()
      .opacity(1);
  }

  /**
   * Add decorative elements to certificate
   */
  private static addDecorativeElements(doc: any): void {
    // Corner decorations
    const cornerSize = 30;
    const lineWidth = 2;

    // Top-left corner
    doc.strokeColor('#e2e8f0')
      .lineWidth(lineWidth)
      .moveTo(50, 50)
      .lineTo(50 + cornerSize, 50)
      .lineTo(50, 50 + cornerSize)
      .stroke();

    // Top-right corner
    doc.moveTo(doc.page.width - 50, 50)
      .lineTo(doc.page.width - 50 - cornerSize, 50)
      .lineTo(doc.page.width - 50, 50 + cornerSize)
      .stroke();

    // Bottom-left corner
    doc.moveTo(50, doc.page.height - 50)
      .lineTo(50 + cornerSize, doc.page.height - 50)
      .lineTo(50, doc.page.height - 50 - cornerSize)
      .stroke();

    // Bottom-right corner
    doc.moveTo(doc.page.width - 50, doc.page.height - 50)
      .lineTo(doc.page.width - 50 - cornerSize, doc.page.height - 50)
      .lineTo(doc.page.width - 50, doc.page.height - 50 - cornerSize)
      .stroke();
  }

  /**
   * Generate unique certificate ID
   */
  private static generateCertificateId(doctor: Doctor, tier: TierConfig): string {
    const timestamp = Date.now().toString(36);
    const doctorId = (doctor.doctor_id || 0).toString().padStart(4, '0');
    const tierCode = tier.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    return `CERT-${tierCode}-${doctorId}-${timestamp}`;
  }

  /**
   * Send certificate via email
   */
  static async sendCertificate(
    doctor: Doctor,
    tier: TierConfig,
    achievementDate: Date = new Date(),
    isMultipleTierAchievement: boolean = false,
    allAchievedTiers?: TierConfig[],
    currentTierIndex?: number
  ): Promise<void> {
    try {
      // Generate certificate PDF
      const certificateBuffer = await this.generateCertificate(doctor, tier, achievementDate);

      // Create email content
      const isLastTier = currentTierIndex !== undefined && currentTierIndex === allAchievedTiers!.length - 1;
      const emailSubject = isMultipleTierAchievement 
        ? `🏆 Achievement Certificate - ${tier.name} Tier (${currentTierIndex! + 1}/${allAchievedTiers!.length})`
        : `🏆 Achievement Certificate - ${tier.name} Tier`;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin-bottom: 10px;">
              ${isMultipleTierAchievement ? '🚀 Multiple Tier Achievement!' : '🎉 Congratulations!'}
            </h1>
            <h2 style="color: #059669; margin: 0;">You've Achieved ${tier.name} Tier!</h2>
            ${isMultipleTierAchievement ? `<p style="color: #6b7280; margin: 5px 0;">Certificate ${currentTierIndex! + 1} of ${allAchievedTiers!.length}</p>` : ''}
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Dear Dr. ${doctor.doctor_name},</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              ${isMultipleTierAchievement 
                ? `We are thrilled to congratulate you on achieving the <strong>${tier.name}</strong> tier! This is part of an incredible multiple tier achievement where you've progressed through multiple levels in a single contribution!`
                : `We are thrilled to congratulate you on achieving the <strong>${tier.name}</strong> tier! Your dedication and valuable contributions to our medical community have earned you this prestigious recognition.`
              }
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your achievement certificate is attached to this email. This certificate is digitally 
              signed by our CEO and President, recognizing your outstanding contribution to our medical community.
            </p>
          </div>

          ${isMultipleTierAchievement ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0;">🎊 Multiple Tier Achievement Progress:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
              ${allAchievedTiers!.map((achievedTier, index) => `
                <span style="background: ${index <= currentTierIndex! ? '#10b981' : '#e5e7eb'}; 
                            color: ${index <= currentTierIndex! ? 'white' : '#6b7280'}; 
                            padding: 8px 12px; 
                            border-radius: 20px; 
                            font-size: 14px; 
                            font-weight: bold;">
                  ${achievedTier.name} ${index <= currentTierIndex! ? '✅' : '⏳'}
                </span>
              `).join('')}
            </div>
            <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
              ${isLastTier 
                ? '🎉 Congratulations! You have received certificates for all tier achievements in this order!'
                : `You are currently at certificate ${currentTierIndex! + 1} of ${allAchievedTiers!.length}. More certificates coming!`
              }
            </p>
          </div>
          ` : ''}

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Achievement Details:</h4>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li><strong>Tier:</strong> ${tier.name}</li>
              <li><strong>Clinic:</strong> ${doctor.clinic_name}</li>
              <li><strong>Achievement Date:</strong> ${achievementDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</li>
              <li><strong>Certificate ID:</strong> ${this.generateCertificateId(doctor, tier)}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Keep up the excellent work! We look forward to seeing you achieve even greater milestones.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This certificate is digitally generated and verified by our system.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
              Hand-signed by: Muhammad Qasim Shabbir (CEO) & Muhammad Asim Shabbir (President)
            </p>
          </div>
        </div>
      `;

      // Save certificate URL (if we save PDF to disk) or generate verification code
      const certificateId = this.generateCertificateId(doctor, tier);
      const verificationCode = `CERT-${certificateId}`;

      // Save certificate to database
      const certificateRepository = AppDataSource.getRepository(Certificate);
      
      // Check if certificate already exists for this tier
      const existingCertificate = await certificateRepository.findOne({
        where: {
          doctor_id: doctor.id,
          certificate_type: 'tier_achievement',
          tier_name: tier.name
        }
      });

      // Save PDF to disk
      const uploadsDir = process.env.CI || process.env.NODE_ENV === 'test' 
        ? path.join(process.cwd(), 'uploads') 
        : '/app/uploads';
      const certificatesDir = path.join(uploadsDir, 'certificates');
      
      // Ensure certificates directory exists
      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true });
      }

      // Generate filename
      const fileName = `certificate_${doctor.id}_${tier.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(certificatesDir, fileName);
      const certificateUrl = `/uploads/certificates/${fileName}`;

      // Save PDF to disk
      fs.writeFileSync(filePath, certificateBuffer);
      console.log(`💾 Saved certificate PDF to: ${filePath}`);

      let certificate: Certificate;
      
      if (existingCertificate) {
        // Update existing certificate
        existingCertificate.issued_at = achievementDate;
        existingCertificate.status = 'issued';
        existingCertificate.verification_code = verificationCode;
        existingCertificate.certificate_url = certificateUrl;
        existingCertificate.updated_at = new Date();
        certificate = await certificateRepository.save(existingCertificate);
        console.log(`🔄 Updated existing certificate for ${doctor.doctor_name} - ${tier.name} tier`);
      } else {
        // Create new certificate record
        certificate = certificateRepository.create({
          doctor_id: doctor.id,
          certificate_type: 'tier_achievement',
          title: `${tier.name} Tier Achievement Certificate`,
          subtitle: `Certificate of Achievement for ${tier.name} Tier`,
          description: `This certificate recognizes ${doctor.clinic_name || doctor.doctor_name} for achieving the ${tier.name} tier through outstanding contributions to the medical community.`,
          achievement: tier.name,
          tier_name: tier.name,
          status: 'issued',
          issued_at: achievementDate,
          verification_code: verificationCode,
          certificate_url: certificateUrl
        });
        certificate = await certificateRepository.save(certificate);
        console.log(`💾 Saved certificate to database for ${doctor.doctor_name} - ${tier.name} tier`);
      }

      // Send email with certificate attachment
      await gmailService.sendEmailWithAttachments(
        doctor.email,
        emailSubject,
        emailContent,
        [
          {
            filename: `Certificate_${tier.name.replace(/\s+/g, '_')}_${doctor.doctor_name.replace(/\s+/g, '_')}.pdf`,
            content: certificateBuffer,
            contentType: 'application/pdf'
          }
        ],
        { isMarketing: false, userId: doctor.id } // Transactional email
      );

      console.log(`✅ Certificate sent to ${doctor.doctor_name} (${doctor.email}) for ${tier.name} tier`);
    } catch (error: unknown) {
      console.error('❌ Error sending certificate:', error);
      throw error;
    }
  }

  /**
   * Check if doctor has achieved a new tier and send certificate
   */
  static async checkAndSendTierCertificate(
    doctor: Doctor,
    newTier: TierConfig,
    previousTier?: TierConfig
  ): Promise<void> {
    try {
      // Only send certificate if it's a new tier achievement
      if (!previousTier || previousTier.name !== newTier.name) {
        await this.sendCertificate(doctor, newTier);
        console.log(`🎉 Certificate sent for new tier achievement: ${newTier.name}`);
      }
    } catch (error: unknown) {
      console.error('Error checking and sending tier certificate:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }
}
