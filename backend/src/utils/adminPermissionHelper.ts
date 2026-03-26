import { AppDataSource } from '../db/data-source';
import { AdminPermission } from '../models/AdminPermission';
import { Doctor } from '../models/Doctor';

/**
 * Check if user is a parent admin (main admin who grants permissions)
 * Parent admins have is_admin flag set and are NOT child admins
 */
export async function isParentAdmin(userId: string): Promise<boolean> {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: userId } });
    
    if (!doctor || !doctor.is_admin) {
      return false;
    }

    // Check if user has an admin permission record (if yes, they're a child admin)
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const permission = await permissionRepository.findOne({
      where: {
        doctor_id: userId,
        is_active: true
      }
    });

    // Parent admin: has is_admin flag but NO permission record (they grant permissions, don't receive them)
    return doctor.is_admin && !permission;
  } catch (error) {
    console.error('Error checking parent admin status:', error);
    return false;
  }
}

/**
 * Check if user is a child admin (has admin permission record granted by parent)
 */
export async function isChildAdmin(userId: string): Promise<boolean> {
  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const permission = await permissionRepository.findOne({
      where: {
        doctor_id: userId,
        is_active: true
      }
    });

    return !!permission;
  } catch (error) {
    console.error('Error checking child admin status:', error);
    return false;
  }
}

/**
 * Check if user is a full admin (has full admin permission but not main admin)
 */
export async function isFullAdmin(userId: string, isMainAdmin: boolean): Promise<boolean> {
  if (isMainAdmin) {
    return false; // Main admin is not a full admin
  }

  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const permission = await permissionRepository.findOne({
      where: {
        doctor_id: userId,
        is_active: true
      }
    });

    return permission?.permission_type === 'full';
  } catch (error) {
    console.error('Error checking full admin status:', error);
    return false;
  }
}

/**
 * Check if user is a viewer admin (can only view, not edit)
 */
export async function isViewerAdmin(userId: string, isMainAdmin: boolean): Promise<boolean> {
  if (isMainAdmin) {
    return false; // Main admin is not a viewer admin
  }

  try {
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const permission = await permissionRepository.findOne({
      where: {
        doctor_id: userId,
        is_active: true
      }
    });

    return permission?.permission_type === 'viewer';
  } catch (error) {
    console.error('Error checking viewer admin status:', error);
    return false;
  }
}

/**
 * Check if target user is a parent admin (main admin who granted permission)
 * This checks if the target user is a parent admin (not a child admin)
 */
export async function isTargetParentAdmin(targetUserId: string): Promise<boolean> {
  try {
    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: targetUserId } });
    
    if (!doctor || !doctor.is_admin) {
      return false;
    }

    // Check if target has permission record (if yes, they're child admin)
    const permissionRepository = AppDataSource.getRepository(AdminPermission);
    const permission = await permissionRepository.findOne({
      where: {
        doctor_id: targetUserId,
        is_active: true
      }
    });

    // Parent admin: has is_admin flag but NO permission record
    return doctor.is_admin && !permission;
  } catch (error) {
    console.error('Error checking target parent admin status:', error);
    return false;
  }
}

/**
 * Check if current user can delete target (prevents child admin from deleting parent admin records)
 * ABSOLUTE RULE: Child admins (even Full Admin) CANNOT delete parent admin records or permissions
 */
export async function canDeleteRecord(
  currentUserId: string,
  currentUserIsMainAdmin: boolean,
  targetUserId: string,
  targetIsParentAdmin: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
  // Parent admin (main admin) can delete anything
  const currentUserIsParentAdmin = await isParentAdmin(currentUserId);
  if (currentUserIsParentAdmin || currentUserIsMainAdmin) {
    return { allowed: true };
  }

  // Check if current user is child admin (has permission record)
  const currentUserIsChildAdmin = await isChildAdmin(currentUserId);
  
  if (currentUserIsChildAdmin) {
    // ABSOLUTE RULE: Child admin CANNOT delete parent admin records or permissions
    const targetIsParent = targetIsParentAdmin || await isTargetParentAdmin(targetUserId);
    if (targetIsParent) {
      return {
        allowed: false,
        reason: 'Child Admin users cannot delete parent admin records or permissions. This action is absolutely restricted.'
      };
    }
  }

  return { allowed: true };
}

