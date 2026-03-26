import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Doctor, UserType } from '../models/Doctor';
import { Notification } from '../models/Notification';
import gmailService from '../services/gmailService';
import gmailApiService from '../services/gmailApiService';

/**
 * Create or get existing conversation with a doctor
 * POST /api/conversations
 */
export const createConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { doctor_id } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!doctor_id) {
      res.status(400).json({
        success: false,
        message: 'Doctor ID is required',
      });
      return;
    }

    // Can't message yourself
    if (userId === doctor_id) {
      res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const conversationRepository = AppDataSource.getRepository(Conversation);
    const notificationRepository = AppDataSource.getRepository(Notification);

    // Check if current user is a doctor - doctors cannot set appointments with other doctors
    const currentUser = await doctorRepository.findOne({ where: { id: userId } });
    if (currentUser?.user_type === UserType.DOCTOR && !currentUser.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Doctors cannot set appointments with other doctors. This feature is for patients only.',
      });
      return;
    }

    // Verify target doctor exists and is approved
    const doctor = await doctorRepository.findOne({
      where: {
        id: doctor_id,
        user_type: UserType.DOCTOR,
        is_approved: true,
        is_deactivated: false,
      },
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    // Check for existing conversation
    let conversation = await conversationRepository.findOne({
      where: [
        { doctor_id, user_id: userId },
        { doctor_id: userId, user_id: doctor_id },
      ],
      relations: ['doctor', 'user'],
    });

    if (conversation) {
      // Existing conversation found - send a follow-up notification to doctor
      const notification = notificationRepository.create({
        recipient_id: doctor_id,
        type: 'new_message',
        payload: {
          title: 'Follow-up Appointment Request',
          message: `${currentUser?.doctor_name || 'A patient'} sent another appointment request`,
          conversation_id: conversation.id,
          sender_id: userId,
          sender_name: currentUser?.doctor_name,
          is_follow_up: true,
        },
      });
      await notificationRepository.save(notification);

      // Update conversation timestamp to bring it to top
      await conversationRepository.update(conversation.id, {
        last_message_at: new Date(),
      });

      // Reload conversation
      conversation = await conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['doctor', 'user'],
      });

      res.json({
        success: true,
        data: conversation?.toPublicJSON(userId),
        message: 'Existing conversation found. Doctor has been notified.',
      });
      return;
    }

    // Create new conversation with pending status (doctor must accept)
    conversation = conversationRepository.create({
      doctor_id,
      user_id: userId,
      status: 'pending',
    });

    await conversationRepository.save(conversation);

    // Create notification for doctor about new appointment request
    const notification = notificationRepository.create({
      recipient_id: doctor_id,
      type: 'new_message',
      payload: {
        title: 'New Appointment Request',
        message: `${currentUser?.doctor_name || 'A user'} wants to book an appointment with you`,
        conversation_id: conversation.id,
        sender_id: userId,
        sender_name: currentUser?.doctor_name,
        requires_acceptance: true,
      },
    });

    await notificationRepository.save(notification);

    // Reload with relations
    conversation = await conversationRepository.findOne({
      where: { id: conversation.id },
      relations: ['doctor', 'user'],
    });

    res.status(201).json({
      success: true,
      data: conversation?.toPublicJSON(userId),
      message: 'Conversation created successfully',
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
    });
  }
};

/**
 * Get user's conversations
 * GET /api/conversations
 */
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const conversationRepository = AppDataSource.getRepository(Conversation);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if current user is an admin
    const currentUser = await doctorRepository.findOne({ where: { id: userId } });
    const isAdmin = currentUser?.is_admin === true;

    // Build query - admins can see all, others only see their own
    let queryBuilder = conversationRepository
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.doctor', 'doctor')
      .leftJoinAndSelect('conv.user', 'user');

    if (isAdmin) {
      // Admins can see ALL conversations (for oversight)
      queryBuilder = queryBuilder.where('conv.status IN (:...statuses)', { statuses: ['pending', 'accepted', 'active'] });
    } else {
      // Regular users and doctors only see conversations they're part of (PRIVATE)
      queryBuilder = queryBuilder
        .where('(conv.doctor_id = :userId OR conv.user_id = :userId)', { userId })
        .andWhere('conv.status IN (:...statuses)', { statuses: ['pending', 'accepted', 'active'] });
    }

    const [conversations, total] = await queryBuilder
      .orderBy('conv.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('conv.created_at', 'DESC')
      .skip(offset)
      .take(limitNum)
      .getManyAndCount();

    // Get last message for each conversation
    const messageRepository = AppDataSource.getRepository(Message);
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await messageRepository.findOne({
          where: { conversation_id: conv.id },
          order: { created_at: 'DESC' },
        });

        return {
          ...conv.toPublicJSON(userId),
          last_message: lastMessage ? {
            content: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
            sender_id: lastMessage.sender_id,
            created_at: lastMessage.created_at,
          } : null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        conversations: conversationsWithLastMessage,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
    });
  }
};

/**
 * Accept an appointment request (doctor only)
 * PUT /api/conversations/:id/accept
 */
export const acceptConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const conversationRepository = AppDataSource.getRepository(Conversation);
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const notificationRepository = AppDataSource.getRepository(Notification);

    // Find the conversation where the current user is the doctor
    const conversation = await conversationRepository.findOne({
      where: { id, doctor_id: userId },
      relations: ['doctor', 'user'],
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not the doctor',
      });
      return;
    }

    // Check if already accepted
    if (conversation.status === 'accepted' || conversation.status === 'active') {
      res.status(400).json({
        success: false,
        message: 'This appointment request has already been accepted',
      });
      return;
    }

    // Get doctor's contact information
    const doctor = await doctorRepository.findOne({
      where: { id: userId },
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
      return;
    }

    // Update conversation status to accepted
    await conversationRepository.update(id, { status: 'accepted' });

    // Prepare doctor's contact info to share with the user
    const doctorContact = {
      email: doctor.email || undefined,
      whatsapp: doctor.whatsapp || undefined,
      clinic_name: doctor.clinic_name || undefined,
      address: doctor.google_location?.address || undefined,
    };

    // Create notification for the user with doctor's contact info
    const notification = Notification.createAppointmentAccepted(
      conversation.user_id,
      doctor.doctor_name || 'Doctor',
      doctorContact
    );

    await notificationRepository.save(notification);

    // Send email notification to user about acceptance
    const user = conversation.user;
    if (user?.email) {
      const sendAcceptanceEmail = async () => {
        try {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .contact-box { background: white; padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0; }
                .contact-item { display: flex; align-items: center; margin: 10px 0; padding: 10px; background: #f0fdf4; border-radius: 6px; }
                .btn { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Appointment Request Accepted!</h1>
                </div>
                <div class="content">
                  <p>Hello <strong>${user.doctor_name || 'there'}</strong>,</p>
                  <p>Great news! <strong>Dr. ${doctor.doctor_name}</strong> has accepted your appointment request.</p>
                  
                  <div class="contact-box">
                    <h3 style="margin-top: 0; color: #059669;">📋 Doctor's Contact Information</h3>
                    ${doctorContact.clinic_name ? `<div class="contact-item">🏥 <strong style="margin-left: 10px;">Clinic:</strong> <span style="margin-left: 10px;">${doctorContact.clinic_name}</span></div>` : ''}
                    ${doctorContact.email ? `<div class="contact-item">📧 <strong style="margin-left: 10px;">Email:</strong> <span style="margin-left: 10px;">${doctorContact.email}</span></div>` : ''}
                    ${doctorContact.whatsapp ? `<div class="contact-item">📱 <strong style="margin-left: 10px;">WhatsApp:</strong> <span style="margin-left: 10px;">${doctorContact.whatsapp}</span></div>` : ''}
                    ${doctorContact.address ? `<div class="contact-item">📍 <strong style="margin-left: 10px;">Address:</strong> <span style="margin-left: 10px;">${doctorContact.address}</span></div>` : ''}
                  </div>
                  
                  <p>You can now contact the doctor directly using the information above, or continue your conversation on AestheticRxNetwork.</p>
                  
                  <center>
                    <a href="${process.env.FRONTEND_URL || 'https://aestheticrxdepolying.vercel.app'}/messages/${id}" class="btn">View Conversation</a>
                  </center>
                  
                  <div class="footer">
                    <p>This is an automated message from AestheticRxNetwork.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          // Try Gmail API first, fallback to SMTP
          if (gmailApiService.isConfigured()) {
            await gmailApiService.sendEmail(user.email, `Appointment Accepted by Dr. ${doctor.doctor_name}`, htmlContent);
            console.log(`✅ Acceptance notification sent to user ${user.email} via Gmail API`);
          } else {
            await gmailService.sendEmail(user.email, `Appointment Accepted by Dr. ${doctor.doctor_name}`, htmlContent);
            console.log(`✅ Acceptance notification sent to user ${user.email} via SMTP`);
          }
        } catch (emailError) {
          console.error('❌ Failed to send acceptance notification email:', emailError);
        }
      };

      // Fire and forget
      sendAcceptanceEmail();
    }

    // Reload conversation with relations
    const updatedConversation = await conversationRepository.findOne({
      where: { id },
      relations: ['doctor', 'user'],
    });

    res.json({
      success: true,
      data: updatedConversation?.toPublicJSON(userId),
      message: 'Appointment request accepted successfully. Your contact information has been shared with the patient.',
    });
  } catch (error) {
    console.error('Error accepting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept appointment request',
    });
  }
};

/**
 * Get messages in a conversation
 * GET /api/conversations/:id/messages
 */
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const conversationRepository = AppDataSource.getRepository(Conversation);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if current user is an admin
    const currentUser = await doctorRepository.findOne({ where: { id: userId } });
    const isAdmin = currentUser?.is_admin === true;
    
    let conversation: Conversation | null = null;

    if (isAdmin) {
      // Admins can view any conversation
      conversation = await conversationRepository.findOne({
        where: { id },
      });
    } else {
      // Regular users/doctors can only view conversations they're part of (PRIVATE)
      conversation = await conversationRepository.findOne({
        where: [
          { id, doctor_id: userId },
          { id, user_id: userId },
        ],
      });
    }

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const messageRepository = AppDataSource.getRepository(Message);

    const [messages, total] = await messageRepository.findAndCount({
      where: { conversation_id: id },
      relations: ['sender'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: limitNum,
    });

    // Mark messages as read
    const unreadMessages = messages.filter(
      (m) => !m.is_read && m.sender_id !== userId
    );

    if (unreadMessages.length > 0) {
      await messageRepository.update(
        { conversation_id: id, sender_id: conversation.doctor_id === userId ? conversation.user_id : conversation.doctor_id, is_read: false },
        { is_read: true, read_at: new Date() }
      );

      // Reset unread count for current user
      if (conversation.doctor_id === userId) {
        await conversationRepository.update(id, { doctor_unread_count: 0 });
      } else {
        await conversationRepository.update(id, { user_unread_count: 0 });
      }
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse().map((m) => m.toPublicJSON()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
};

/**
 * Send a message
 * POST /api/conversations/:id/messages
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { content, message_type = 'text' } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
      return;
    }

    const conversationRepository = AppDataSource.getRepository(Conversation);
    const messageRepository = AppDataSource.getRepository(Message);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if current user is an admin
    const currentUser = await doctorRepository.findOne({ where: { id: userId } });
    const isAdmin = currentUser?.is_admin === true;

    let conversation: Conversation | null = null;

    if (isAdmin) {
      // Admins can send messages in any conversation (for moderation/support)
      conversation = await conversationRepository.findOne({
        where: { id },
        relations: ['doctor', 'user'],
      });
    } else {
      // Regular users/doctors can only send in conversations they're part of (PRIVATE)
      conversation = await conversationRepository.findOne({
        where: [
          { id, doctor_id: userId },
          { id, user_id: userId },
        ],
        relations: ['doctor', 'user'],
      });
    }

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Create message
    const message = messageRepository.create({
      conversation_id: id,
      sender_id: userId,
      content: content.trim(),
      message_type,
    });

    await messageRepository.save(message);

    // Update conversation
    const isDoctor = conversation.doctor_id === userId;
    await conversationRepository.update(id, {
      last_message_at: new Date(),
      ...(isDoctor
        ? { user_unread_count: () => 'user_unread_count + 1' }
        : { doctor_unread_count: () => 'doctor_unread_count + 1' }),
    });

    // Create notification for recipient
    const recipientId = isDoctor ? conversation.user_id : conversation.doctor_id;
    const sender = isDoctor ? conversation.doctor : conversation.user;

    const notificationRepository = AppDataSource.getRepository(Notification);
    const notification = notificationRepository.create({
      recipient_id: recipientId,
      type: 'admin_alert', // Using existing type
      payload: {
        title: 'New Message',
        message: `${sender?.doctor_name || 'Someone'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        conversation_id: id,
        message_id: message.id,
        sender_id: userId,
        sender_name: sender?.doctor_name,
      },
    });

    await notificationRepository.save(notification);

    // Send email notification to doctor when user sends a message (appointment request)
    if (!isDoctor && conversation.doctor?.email) {
      const senderName = sender?.doctor_name || 'A user';
      const doctorName = conversation.doctor.doctor_name || 'Doctor';
      const doctorEmail = conversation.doctor.email;

      // Send email notification in background (don't wait)
      const sendNotificationEmail = async () => {
        try {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
                .btn { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📬 New Appointment Request</h1>
                </div>
                <div class="content">
                  <p>Hello <strong>${doctorName}</strong>,</p>
                  <p>You have received a new message from <strong>${senderName}</strong> on AestheticRxNetwork.</p>
                  
                  <div class="message-box">
                    <strong>Message:</strong>
                    <p style="color: #374151; margin-top: 10px;">${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</p>
                  </div>
                  
                  <p>Please login to your AestheticRxNetwork account to view the full message and respond to your patient.</p>
                  
                  <center>
                    <a href="${process.env.FRONTEND_URL || 'https://aestheticrxdepolying.vercel.app'}/messages/${id}" class="btn">View Message</a>
                  </center>
                  
                  <div class="footer">
                    <p>This is an automated message from AestheticRxNetwork.</p>
                    <p>Please do not reply to this email.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          // Try Gmail API first, fallback to SMTP
          if (gmailApiService.isConfigured()) {
            await gmailApiService.sendEmail(doctorEmail, `New Appointment Request from ${senderName}`, htmlContent);
            console.log(`✅ Appointment notification sent to doctor ${doctorEmail} via Gmail API`);
          } else {
            await gmailService.sendEmail(doctorEmail, `New Appointment Request from ${senderName}`, htmlContent);
            console.log(`✅ Appointment notification sent to doctor ${doctorEmail} via SMTP`);
          }
        } catch (emailError) {
          console.error('❌ Failed to send appointment notification email:', emailError);
          // Don't fail the message send if email fails
        }
      };

      // Fire and forget - don't wait for email
      sendNotificationEmail();
    }

    // Reload message with sender relation
    const savedMessage = await messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });

    res.status(201).json({
      success: true,
      data: savedMessage?.toPublicJSON(),
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

/**
 * Mark conversation as read
 * PUT /api/conversations/:id/read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const conversationRepository = AppDataSource.getRepository(Conversation);
    const messageRepository = AppDataSource.getRepository(Message);
    const doctorRepository = AppDataSource.getRepository(Doctor);

    // Check if current user is an admin
    const currentUser = await doctorRepository.findOne({ where: { id: userId } });
    const isAdmin = currentUser?.is_admin === true;

    let conversation: Conversation | null = null;

    if (isAdmin) {
      // Admins can access any conversation
      conversation = await conversationRepository.findOne({
        where: { id },
      });
    } else {
      // Regular users/doctors can only access conversations they're part of (PRIVATE)
      conversation = await conversationRepository.findOne({
        where: [
          { id, doctor_id: userId },
          { id, user_id: userId },
        ],
      });
    }

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isDoctor = conversation.doctor_id === userId;
    const otherUserId = isDoctor ? conversation.user_id : conversation.doctor_id;

    // Mark all messages from other user as read
    await messageRepository.update(
      { conversation_id: id, sender_id: otherUserId, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    // Reset unread count
    if (isDoctor) {
      await conversationRepository.update(id, { doctor_unread_count: 0 });
    } else {
      await conversationRepository.update(id, { user_unread_count: 0 });
    }

    res.json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
    });
  }
};

/**
 * Get unread message count
 * GET /api/conversations/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const conversationRepository = AppDataSource.getRepository(Conversation);

    // Get conversations where user is doctor (include pending, accepted, and active)
    const doctorConversations = await conversationRepository
      .createQueryBuilder('conv')
      .where('conv.doctor_id = :userId', { userId })
      .andWhere('conv.status IN (:...statuses)', { statuses: ['pending', 'accepted', 'active'] })
      .select(['conv.doctor_unread_count', 'conv.status'])
      .getMany();

    // Get conversations where user is the contacting user (include pending, accepted, and active)
    const userConversations = await conversationRepository
      .createQueryBuilder('conv')
      .where('conv.user_id = :userId', { userId })
      .andWhere('conv.status IN (:...statuses)', { statuses: ['pending', 'accepted', 'active'] })
      .select(['conv.user_unread_count', 'conv.status'])
      .getMany();
    
    // Count pending requests for doctors (these also count as "unread" attention needed)
    const pendingRequestsCount = doctorConversations.filter(c => c.status === 'pending').length;

    const totalUnread = 
      doctorConversations.reduce((sum, c) => sum + c.doctor_unread_count, 0) +
      userConversations.reduce((sum, c) => sum + c.user_unread_count, 0);

    res.json({
      success: true,
      data: {
        unread_count: totalUnread + pendingRequestsCount, // Include pending requests in badge count
        pending_requests: pendingRequestsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};

