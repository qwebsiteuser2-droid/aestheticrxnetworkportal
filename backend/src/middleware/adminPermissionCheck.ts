import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getUserAdminPermissions } from '../controllers/adminController';
import { isViewerAdmin, isFullAdmin, canDeleteRecord, isParentAdmin } from '../utils/adminPermissionHelper';

/**
 * Middleware to check if user can perform edit/update operations
 * Viewer admin can only view, not edit
 */
export const checkEditPermission = async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
  try {
    const user = req.user!;
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const userIsViewerAdmin = await isViewerAdmin(user.id, isMainAdmin);

    if (userIsViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Edit/Update operations are not allowed.'
      });
      return;
    }

    next();
  } catch (error: unknown) {
    console.error('Error checking edit permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking permissions'
    });
  }
};

/**
 * Middleware to check if user can perform delete operations
 * Viewer admin cannot delete, Full admin cannot delete parent admin records
 */
export const checkDeletePermission = async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
  try {
    const user = req.user!;
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const userIsViewerAdmin = await isViewerAdmin(user.id, isMainAdmin);

    // Viewer admin cannot delete
    if (userIsViewerAdmin) {
      res.status(403).json({
        success: false,
        message: 'Viewer Admin can only view records. Delete operations are not allowed.'
      });
      return;
    }

    // For delete operations, check if target is parent admin (if applicable)
    // This will be checked in individual controllers based on context
    next();
  } catch (error: unknown) {
    console.error('Error checking delete permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking permissions'
    });
  }
};

/**
 * Check if user can delete a specific record (prevents full admin from deleting parent admin records)
 */
export const checkCanDeleteRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  targetUserId: string,
  next: Function
): Promise<void> => {
  try {
    const user = req.user!;
    const currentUserPermission = await getUserAdminPermissions(user.id);
    const isMainAdmin = user.is_admin && !currentUserPermission;
    const targetIsParentAdmin = await isParentAdmin(targetUserId);
    
    const deleteCheck = await canDeleteRecord(user.id, isMainAdmin, targetUserId, targetIsParentAdmin);
    
    if (!deleteCheck.allowed) {
      res.status(403).json({
        success: false,
        message: deleteCheck.reason || 'You do not have permission to delete this record'
      });
      return;
    }

    next();
  } catch (error: unknown) {
    console.error('Error checking delete record permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking permissions'
    });
  }
};

