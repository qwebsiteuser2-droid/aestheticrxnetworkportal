'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otpCode: string) => void;
  userId: string;
  userRole: string;
  userEmail: string;
  onResendOTP: () => void;
}

export default function OTPModal({ 
  isOpen, 
  onClose, 
  onVerify, 
  userId, 
  userRole, 
  userEmail,
  onResendOTP 
}: OTPModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(120); // Reset timer when modal opens
      setCanResend(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      await onVerify(otpCode);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      await onResendOTP();
      setTimeLeft(120);
      setCanResend(false);
      toast.success('OTP sent successfully!');
    } catch (error: unknown) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              🔐 OTP Verification
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <EnvelopeIcon className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Check Your Email
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                We've sent a 6-digit verification code to:
              </p>
              
              <p className="text-sm font-medium text-blue-600 mb-4">
                {userEmail}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center text-blue-800 text-sm">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  <span className="font-medium">
                    {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'OTP Expired'}
                  </span>
                </div>
              </div>

            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otpCode}
                  onChange={handleInputChange}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the code?
              </p>
              
              <button
                onClick={handleResendOTP}
                disabled={!canResend || isLoading}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {canResend ? 'Resend OTP' : `Resend in ${formatTime(timeLeft)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
