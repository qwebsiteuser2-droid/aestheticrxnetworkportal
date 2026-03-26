import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Doctor } from './Doctor';

export type PermissionType = 'viewer' | 'custom' | 'full';

export interface PermissionConfig {
  // User Management
  can_view_users: boolean;
  can_edit_users: boolean;
  can_delete_users: boolean;
  can_approve_users: boolean;
  
  // Product Management
  can_view_products: boolean;
  can_create_products: boolean;
  can_edit_products: boolean;
  can_delete_products: boolean;
  
  // Research Management
  can_view_research: boolean;
  can_approve_research: boolean;
  can_reject_research: boolean;
  can_delete_research: boolean;
  can_manage_benefits: boolean;
  can_manage_rewards: boolean;
  
  // Order Management
  can_view_orders: boolean;
  can_edit_orders: boolean;
  can_cancel_orders: boolean;
  
  // Tier Management
  can_view_tiers: boolean;
  can_edit_tiers: boolean;
  
  // Signup ID Management
  can_view_signup_ids: boolean;
  can_create_signup_ids: boolean;
  can_delete_signup_ids: boolean;
  
  // Reports & Analytics
  can_view_reports: boolean;
  can_export_data: boolean;
  
  // System Settings
  can_view_settings: boolean;
  can_edit_settings: boolean;
}

@Entity('admin_permissions')
@Index(['doctor_id'])
@Index(['permission_type'])
@Index(['is_active'])
export class AdminPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  doctor_id!: string;

  @Column({ 
    type: 'enum', 
    enum: ['viewer', 'custom', 'full'],
    default: 'viewer'
  })
  permission_type!: PermissionType;

  @Column({ type: 'jsonb', default: '{}' })
  permissions!: PermissionConfig;

  @Column({ type: 'uuid' })
  granted_by!: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at!: Date;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Doctor, (doctor) => doctor.id)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Doctor, (doctor) => doctor.id)
  @JoinColumn({ name: 'granted_by' })
  granted_by_doctor!: Doctor;

  toJSON() {
    return {
      id: this.id,
      doctor_id: this.doctor_id,
      permission_type: this.permission_type,
      permissions: this.permissions,
      granted_by: this.granted_by,
      expires_at: this.expires_at,
      is_active: this.is_active,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      doctor: this.doctor?.toPublicJSON(),
      granted_by_doctor: this.granted_by_doctor?.toPublicJSON()
    };
  }

  // Helper method to check if user has specific permission
  hasPermission(permission: keyof PermissionConfig): boolean {
    if (this.permission_type === 'full') {
      return true;
    }
    
    if (this.permission_type === 'viewer') {
      // Viewer permissions - only read access
      return permission.startsWith('can_view_');
    }
    
    if (this.permission_type === 'custom') {
      return this.permissions[permission] || false;
    }
    
    return false;
  }

  // Helper method to get default permissions for viewer
  static getViewerPermissions(): PermissionConfig {
    return {
      can_view_users: true,
      can_edit_users: false,
      can_delete_users: false,
      can_approve_users: false,
      can_view_products: true,
      can_create_products: false,
      can_edit_products: false,
      can_delete_products: false,
      can_view_research: true,
      can_approve_research: false,
      can_reject_research: false,
      can_delete_research: false,
      can_manage_benefits: false,
      can_manage_rewards: false,
      can_view_orders: true,
      can_edit_orders: false,
      can_cancel_orders: false,
      can_view_tiers: true,
      can_edit_tiers: false,
      can_view_signup_ids: true,
      can_create_signup_ids: false,
      can_delete_signup_ids: false,
      can_view_reports: true,
      can_export_data: false,
      can_view_settings: true,
      can_edit_settings: false
    };
  }

  // Helper method to get default permissions for full admin
  static getFullPermissions(): PermissionConfig {
    return {
      can_view_users: true,
      can_edit_users: true,
      can_delete_users: true,
      can_approve_users: true,
      can_view_products: true,
      can_create_products: true,
      can_edit_products: true,
      can_delete_products: true,
      can_view_research: true,
      can_approve_research: true,
      can_reject_research: true,
      can_delete_research: true,
      can_manage_benefits: true,
      can_manage_rewards: true,
      can_view_orders: true,
      can_edit_orders: true,
      can_cancel_orders: true,
      can_view_tiers: true,
      can_edit_tiers: true,
      can_view_signup_ids: true,
      can_create_signup_ids: true,
      can_delete_signup_ids: true,
      can_view_reports: true,
      can_export_data: true,
      can_view_settings: true,
      can_edit_settings: true
    };
  }
}
