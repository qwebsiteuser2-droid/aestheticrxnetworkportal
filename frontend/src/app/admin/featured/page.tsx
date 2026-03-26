'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { Header } from '@/components/layout/Header';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
  ShoppingCartIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { getApiBaseUrl as getApiBaseUrlFromLib } from '@/lib/getApiUrl';

interface Product {
  id: string;
  name: string;
  price: string | number;
  image_url: string | null;
}

interface Doctor {
  id: string;
  name: string;
  clinic_name?: string;
  profile_photo_url?: string;
}

interface FeaturedItem {
  id: string;
  item_type: string;
  item_id: string;
  display_order: number;
  is_active: boolean;
  item_data: Product | Doctor | null;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return getApiBaseUrlFromLib();
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

export default function FeaturedItemsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [featuredProducts, setFeaturedProducts] = useState<FeaturedItem[]>([]);
  const [featuredDoctors, setFeaturedDoctors] = useState<FeaturedItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selected items for editing
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.is_admin) {
      fetchFeaturedItems();
    }
  }, [isAuthenticated, user]);

  const fetchFeaturedItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/featured');
      
      // Axios response: data is in response.data
      const responseData = response.data;
      console.log('Featured items response:', responseData);
      
      if (responseData?.success) {
        setFeaturedProducts(responseData.data?.featured_products || []);
        setFeaturedDoctors(responseData.data?.featured_doctors || []);
        setAvailableProducts(responseData.data?.available_products || []);
        setAvailableDoctors(responseData.data?.available_doctors || []);

        // Set selected items from current featured
        setSelectedProducts(
          responseData.data?.featured_products?.map((f: FeaturedItem) => f.item_id) || []
        );
        setSelectedDoctors(
          responseData.data?.featured_doctors?.map((f: FeaturedItem) => f.item_id) || []
        );
      } else {
        console.error('API returned success=false:', responseData);
        toast.error(responseData?.message || 'Failed to load featured items');
      }
    } catch (err: any) {
      console.error('Error fetching featured items:', err);
      console.error('Error details:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to load featured items');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 4) {
        toast.error('Maximum 4 products can be featured');
        return prev;
      }
      return [...prev, productId];
    });
  };

  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctors(prev => {
      if (prev.includes(doctorId)) {
        return prev.filter(id => id !== doctorId);
      }
      if (prev.length >= 4) {
        toast.error('Maximum 4 doctors can be featured');
        return prev;
      }
      return [...prev, doctorId];
    });
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedProducts.length) return;

    const newSelected = [...selectedProducts];
    [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
    setSelectedProducts(newSelected);
  };

  const moveDoctor = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedDoctors.length) return;

    const newSelected = [...selectedDoctors];
    [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
    setSelectedDoctors(newSelected);
  };

  const saveProducts = async () => {
    try {
      setSaving(true);
      const response = await api.post('/admin/featured/products', {
        product_ids: selectedProducts,
      });

      // Axios response: data is in response.data
      if (response.data?.success) {
        toast.success('Featured products updated!');
        fetchFeaturedItems();
      } else {
        toast.error(response.data?.message || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving products:', err);
      toast.error(err.response?.data?.message || 'Failed to save featured products');
    } finally {
      setSaving(false);
    }
  };

  const saveDoctors = async () => {
    try {
      setSaving(true);
      const response = await api.post('/admin/featured/doctors', {
        doctor_ids: selectedDoctors,
      });

      // Axios response: data is in response.data
      if (response.data?.success) {
        toast.success('Featured doctors updated!');
        fetchFeaturedItems();
      } else {
        toast.error(response.data?.message || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving doctors:', err);
      toast.error(err.response?.data?.message || 'Failed to save featured doctors');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !isAuthenticated || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLoginClick={() => router.push('/login')}
        onRegisterClick={() => router.push('/signup/select-type')}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Featured Items</h1>
          <p className="text-gray-600 mt-2">
            Select which products and doctors appear on the landing page hero cards
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Featured Products Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShoppingCartIcon className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">Featured Products</h2>
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {selectedProducts.length}/4 selected
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Selected (drag to reorder)</h3>
                    <div className="space-y-2">
                      {selectedProducts.map((productId, index) => {
                        const product = availableProducts.find(p => p.id === productId);
                        if (!product) return null;
                        
                        return (
                          <div
                            key={productId}
                            className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                                {product.id ? (
                                  <Image
                                    src={`${getApiBaseUrl()}/api/product-images/${product.id}`}
                                    alt={product.name}
                                    width={40}
                                    unoptimized
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCartIcon className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-gray-900 truncate max-w-[150px]">
                                {product.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => moveProduct(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                              >
                                <ArrowUpIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveProduct(index, 'down')}
                                disabled={index === selectedProducts.length - 1}
                                className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                              >
                                <ArrowDownIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleProductSelect(productId)}
                                className="p-1 text-red-500 hover:text-red-600"
                              >
                                <XMarkIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Products */}
                <h3 className="text-sm font-medium text-gray-700 mb-3">Available Products</h3>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {availableProducts.filter(p => !selectedProducts.includes(p.id)).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {product.id ? (
                          <Image
                            src={`${getApiBaseUrl()}/api/product-images/${product.id}`}
                            alt={product.name}
                            width={32}
                            unoptimized
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCartIcon className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{product.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={saveProducts}
                  disabled={saving}
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      <span>Save Featured Products</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Featured Doctors Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserGroupIcon className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">Featured Doctors</h2>
                  </div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {selectedDoctors.length}/4 selected
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Selected Doctors */}
                {selectedDoctors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Selected (drag to reorder)</h3>
                    <div className="space-y-2">
                      {selectedDoctors.map((doctorId, index) => {
                        const doctor = availableDoctors.find(d => d.id === doctorId);
                        if (!doctor) return null;
                        
                        return (
                          <div
                            key={doctorId}
                            className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                                {doctor.profile_photo_url ? (
                                  <Image
                                    src={doctor.profile_photo_url.startsWith('http') ? doctor.profile_photo_url : `${getApiBaseUrl()}${doctor.profile_photo_url}`}
                                    alt={doctor.name}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold">
                                    {doctor.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-gray-900 block truncate max-w-[120px]">
                                  {doctor.name}
                                </span>
                                {doctor.clinic_name && (
                                  <span className="text-xs text-gray-500 truncate block max-w-[120px]">
                                    {doctor.clinic_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => moveDoctor(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-500 hover:text-emerald-600 disabled:opacity-30"
                              >
                                <ArrowUpIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveDoctor(index, 'down')}
                                disabled={index === selectedDoctors.length - 1}
                                className="p-1 text-gray-500 hover:text-emerald-600 disabled:opacity-30"
                              >
                                <ArrowDownIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDoctorSelect(doctorId)}
                                className="p-1 text-red-500 hover:text-red-600"
                              >
                                <XMarkIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Doctors */}
                <h3 className="text-sm font-medium text-gray-700 mb-3">Available Doctors</h3>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {availableDoctors.filter(d => !selectedDoctors.includes(d.id)).map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => handleDoctorSelect(doctor.id)}
                      className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {doctor.profile_photo_url ? (
                          <Image
                            src={doctor.profile_photo_url.startsWith('http') ? doctor.profile_photo_url : `${getApiBaseUrl()}${doctor.profile_photo_url}`}
                            alt={doctor.name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-sm">
                            {doctor.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{doctor.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={saveDoctors}
                  disabled={saving}
                  className="mt-6 w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      <span>Save Featured Doctors</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

