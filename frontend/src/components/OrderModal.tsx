'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useAuth } from '@/app/providers';
import { ordersApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';

const orderSchema = z.object({
  qty: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
  useDefaultLocation: z.boolean(),
  customLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(1, 'Address is required')
  }).optional()
}).refine((data) => {
  if (!data.useDefaultLocation && !data.customLocation) {
    return false;
  }
  return true;
}, {
  message: "Please provide a delivery location",
  path: ["customLocation"]
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrderModal({ product, isOpen, onClose, onSuccess }: OrderModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      qty: 1,
      useDefaultLocation: true
    }
  });

  const useDefaultLocation = watch('useDefaultLocation');
  const qty = watch('qty');

  const onSubmit = async (data: OrderFormData) => {
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        product_id: product.id,
        qty: data.qty,
        order_location: data.useDefaultLocation 
          ? user?.google_location 
          : data.customLocation,
        notes: data.notes
      };

      const response = await ordersApi.create(orderData);
      
      if (response.success) {
        toast.success('Order placed successfully!');
        reset();
        setStep(1);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep(1);
    onClose();
  };

  const handleLocationChange = (location: { lat: number; lng: number; address: string }) => {
    setValue('customLocation', location);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 1 ? 'Confirm Order' : 'Final Confirmation'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {step} of 2
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                step >= 2 ? 'bg-primary-600' : 'bg-gray-200'
              }`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Order Details</span>
              <span>Confirmation</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                {product.id ? (
                  <img
                    src={`${getApiUrl().replace('/api', '')}/api/product-images/${product.id}`}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const nextSibling = e.currentTarget.nextElementSibling;
                      if (nextSibling) (nextSibling as HTMLElement).style.display = 'block';
                    }}
                  />
                ) : null}
                <span className={`text-2xl ${product.id ? 'hidden' : ''}`}>📦</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">Slot {product.slot_index}</p>
                {product.price && (
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(product.price)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 ? (
              <>
                {/* Quantity */}
                <div>
                  <label htmlFor="qty" className="form-label">
                    Quantity
                  </label>
                  <input
                    {...register('qty', { valueAsNumber: true })}
                    type="number"
                    id="qty"
                    min="1"
                    className="form-input"
                    disabled={isLoading}
                  />
                  {errors.qty && (
                    <p className="form-error">{errors.qty.message}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="form-label">Delivery Location</label>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        {...register('useDefaultLocation')}
                        type="radio"
                        value="true"
                        className="form-radio mr-3"
                        disabled={isLoading}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Use default location
                        </span>
                        <p className="text-xs text-gray-500">
                          {user?.google_location?.address || 'No default location set'}
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center">
                      <input
                        {...register('useDefaultLocation')}
                        type="radio"
                        value="false"
                        className="form-radio mr-3"
                        disabled={isLoading}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        Use different location for this order
                      </span>
                    </label>
                  </div>

                  {!useDefaultLocation && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <MapPinIcon className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800">
                          Please provide the delivery address for this order
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter delivery address"
                        className="form-input mt-2"
                        disabled={isLoading}
                        onChange={(e) => {
                          setValue('customLocation', {
                            lat: 0, // Will be geocoded
                            lng: 0, // Will be geocoded
                            address: e.target.value
                          });
                        }}
                      />
                    </div>
                  )}

                  {errors.customLocation && (
                    <p className="form-error">{errors.customLocation.message}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="form-label">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    id="notes"
                    rows={3}
                    className="form-textarea"
                    placeholder="Any special instructions or notes for this order..."
                    disabled={isLoading}
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-primary-50 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-900 mb-2">Order Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Product:</span>
                      <span>{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{qty}</span>
                    </div>
                    {product.price && (
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatCurrency(product.price * qty)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Final Confirmation */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to place your order?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Please review your order details and confirm to proceed.
                  </p>
                </div>

                {/* Order Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{qty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery to:</span>
                    <span className="font-medium">
                      {useDefaultLocation 
                        ? user?.google_location?.address 
                        : 'Custom location provided'
                      }
                    </span>
                  </div>
                  {product.price && (
                    <div className="flex justify-between text-lg font-semibold border-t pt-3">
                      <span>Total:</span>
                      <span className="text-primary-600">
                        {formatCurrency(product.price * qty)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline"
                  disabled={isLoading}
                >
                  Back
                </button>
              )}
              
              <button
                type="button"
                onClick={handleClose}
                className="btn-outline"
                disabled={isLoading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Processing...
                  </div>
                ) : step === 1 ? (
                  'Continue'
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

