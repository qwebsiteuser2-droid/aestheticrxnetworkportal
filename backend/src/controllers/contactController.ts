import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { AuthenticatedRequest } from '../types/auth';
import gmailService from '../services/gmailService';

// Send contact message to admin
export const sendContactMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { subject, message, advertisementId } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!subject || !message) {
      res.status(400).json({ success: false, message: 'Subject and message are required.' });
      return;
    }

    // Create contact message data
    const contactData = {
      id: require('crypto').randomUUID(),
      user_id: user.id,
      user_name: user.doctor_name,
      user_email: user.email,
      clinic_name: user.clinic_name,
      subject,
      message,
      advertisement_id: advertisementId || null,
      created_at: new Date()
    };

    // Save to database using raw SQL
    const query = `
      INSERT INTO contact_messages (
        id, user_id, user_name, user_email, clinic_name, subject, message, advertisement_id, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `;
    
    const values = [
      contactData.id,
      user.id,
      user.doctor_name,
      user.email,
      user.clinic_name,
      subject,
      message,
      advertisementId || null,
      contactData.created_at
    ];

    await AppDataSource.query(query, values);
    console.log('✅ Contact message saved to database successfully');

    // Send email notification to admins
    try {
      await gmailService.sendContactMessageAlert(contactData);
      console.log('📧 Contact message notification sent to admins');
    } catch (emailError) {
      console.error('❌ Failed to send contact notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully. Admin will respond soon.',
      data: contactData
    });
  } catch (error: unknown) {
    console.error('Error sending contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message.',
      error: (error instanceof Error ? error.message : String(error))
    });
  }
};

// Get all contact messages (Admin only)
export const getAllContactMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.is_admin) {
      res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Only admins can view contact messages.' 
      });
      return;
    }

    // Fetch contact messages using raw SQL
    const query = `
      SELECT 
        cm.*,
        a.title as advertisement_title
      FROM contact_messages cm
      LEFT JOIN advertisements a ON cm.advertisement_id = a.id
      ORDER BY cm.created_at DESC
    `;
    
    const messages = await AppDataSource.query(query);

    res.status(200).json({ 
      success: true, 
      messages
    });
  } catch (error: unknown) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contact messages.', 
      error: (error instanceof Error ? error.message : String(error)) 
    });
  }
};
