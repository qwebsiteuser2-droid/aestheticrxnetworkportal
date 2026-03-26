import { Request } from 'express';
import { Doctor } from '../models/Doctor';

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  doctorId: number;
  isAdmin: boolean;
  isApproved: boolean;
  iat?: number;
  exp?: number;
}

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: Doctor;
  jwtPayload?: JWTPayload;
  query: any;
  params: any;
  body: any;
  headers: any;
  ip: string | undefined;
  file?: any;
}

// Login request interface
export interface LoginRequest {
  email: string;
  password: string;
  otpCode?: string;
}

// Registration request interface
export interface RegisterRequest {
  email: string;
  password: string;
  clinic_name?: string; // Optional for employees
  doctor_name: string;
  signup_id?: string; // Only required for doctors
  whatsapp?: string;
  google_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  consent: boolean;
  user_type?: 'doctor' | 'regular_user' | 'employee'; // User type selection
}

// Auth response interface
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Partial<Doctor>;
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Password reset request interface
export interface PasswordResetRequest {
  email: string;
}

// Password reset confirm interface
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// Change password interface
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Auth middleware options
export interface AuthMiddlewareOptions {
  requireApproval?: boolean;
  requireAdmin?: boolean;
  allowUnapproved?: boolean;
}

// Session interface
export interface SessionData {
  userId: string;
  email: string;
  doctorId: number;
  isAdmin: boolean;
  isApproved: boolean;
  loginTime: Date;
  lastActivity: Date;
}
