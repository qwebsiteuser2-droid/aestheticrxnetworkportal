'use client';

import { validatePassword } from '@/lib/auth';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p: string) => /\d/.test(p) },
  {
    id: 'special',
    label: 'One special character (!@#$%^&* etc.)',
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
] as const;

interface PasswordRequirementsListProps {
  password: string;
  className?: string;
}

export function PasswordRequirementsList({ password, className = '' }: PasswordRequirementsListProps) {
  return (
    <ul className={`space-y-1.5 text-sm ${className}`} aria-live="polite">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = password.length > 0 && req.test(password);
        return (
          <li
            key={req.id}
            className={`flex items-start gap-2 ${met ? 'text-green-700' : 'text-gray-600'}`}
          >
            {met ? (
              <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" aria-hidden />
            ) : (
              <span className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full border border-gray-300" aria-hidden />
            )}
            <span>{req.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface PasswordRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  password?: string;
  errors?: string[];
  title?: string;
}

export function PasswordRequirementsModal({
  isOpen,
  onClose,
  password = '',
  errors,
  title = 'Password requirements',
}: PasswordRequirementsModalProps) {
  if (!isOpen) return null;

  const validation = validatePassword(password);
  const displayErrors = errors?.length ? errors : validation.errors;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-requirements-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <h3 id="password-requirements-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Your password must meet all of the following criteria:
        </p>

        <PasswordRequirementsList password={password} className="mb-4" />

        {displayErrors.length > 0 && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
            <p className="text-sm font-medium text-red-800 mb-1">Still missing:</p>
            <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
              {displayErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function getPasswordValidation(password: string) {
  return validatePassword(password);
}
