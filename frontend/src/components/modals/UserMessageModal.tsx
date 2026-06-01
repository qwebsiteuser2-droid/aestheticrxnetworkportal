'use client';

import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

type Variant = 'info' | 'warning' | 'error';

interface UserMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: Variant;
  onConfirm?: () => void;
}

const variantStyles: Record<Variant, { icon: string; button: string }> = {
  info: { icon: 'bg-blue-100 text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
  warning: { icon: 'bg-amber-100 text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' },
  error: { icon: 'bg-red-100 text-red-600', button: 'bg-red-600 hover:bg-red-700' },
};

export function UserMessageModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'OK',
  variant = 'info',
  onConfirm,
}: UserMessageModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-message-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="flex justify-center mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${styles.icon}`}>
            {variant === 'info' ? (
              <InformationCircleIcon className="w-8 h-8" />
            ) : (
              <ExclamationTriangleIcon className="w-8 h-8" />
            )}
          </div>
        </div>
        <h3 id="user-message-modal-title" className="text-xl font-bold text-gray-900 text-center mb-2">
          {title}
        </h3>
        <p className="text-gray-600 text-center mb-6 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => {
            onConfirm?.();
            onClose();
          }}
          className={`w-full py-3 px-4 text-white font-medium rounded-xl transition-colors ${styles.button}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
