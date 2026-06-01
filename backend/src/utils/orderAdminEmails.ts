import { AppDataSource } from '../db/data-source';
import { Doctor } from '../models/Doctor';
import { AdminPermission } from '../models/AdminPermission';

/**
 * Gmail account that sends mail via API (must match OAuth refresh token account).
 */
export function getGmailSenderEmail(): string {
  return (
    process.env.GMAIL_API_USER_EMAIL ||
    process.env.GMAIL_USER ||
    ''
  )
    .trim()
    .toLowerCase();
}

/**
 * Collect admin email addresses for order / payment notifications.
 * Always includes MAIN_ADMIN_EMAIL, SECONDARY_ADMIN_EMAIL, and the Gmail sender inbox.
 */
export async function collectOrderNotificationAdminEmails(): Promise<string[]> {
  const adminEmails: string[] = [];

  const senderEmail = getGmailSenderEmail();
  if (senderEmail && !adminEmails.includes(senderEmail)) {
    adminEmails.push(senderEmail);
  }

  if (process.env.MAIN_ADMIN_EMAIL?.trim()) {
    const main = process.env.MAIN_ADMIN_EMAIL.trim().toLowerCase();
    if (!adminEmails.includes(main)) {
      adminEmails.push(main);
    }
  }
  if (process.env.SECONDARY_ADMIN_EMAIL?.trim()) {
    const secondary = process.env.SECONDARY_ADMIN_EMAIL.trim().toLowerCase();
    if (!adminEmails.includes(secondary)) {
      adminEmails.push(secondary);
    }
  }

  const doctorRepository = AppDataSource.getRepository(Doctor);
  const permissionRepository = AppDataSource.getRepository(AdminPermission);

  const parentAdmins = await doctorRepository.find({
    where: { is_admin: true, is_deactivated: false },
  });

  const fullAdminPermissions = await permissionRepository.find({
    where: { is_active: true, permission_type: 'full' },
    relations: ['doctor'],
  });

  const childAdminIds = new Set(fullAdminPermissions.map((p) => p.doctor_id));

  for (const admin of parentAdmins) {
    if (!childAdminIds.has(admin.id) && admin.email && !adminEmails.includes(admin.email)) {
      adminEmails.push(admin.email);
    }
  }

  for (const permission of fullAdminPermissions) {
    const email = permission.doctor?.email;
    if (
      permission.doctor &&
      email &&
      permission.doctor.is_approved &&
      !permission.doctor.is_deactivated &&
      !adminEmails.includes(email)
    ) {
      adminEmails.push(email);
    }
  }

  return adminEmails;
}
