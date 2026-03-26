'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCartIcon, UserGroupIcon, ArrowRightIcon, MapPinIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useAuth } from '@/app/providers';
import { getApiBaseUrl as getApiBaseUrlFromLib } from '@/lib/getApiUrl';

interface Product {
  id: string;
  name: string;
  price: string | number;
  image_url: string | null;
}

interface Doctor {
  id: string;
  doctor_name: string;
  clinic_name?: string;
  profile_photo_url?: string;
  is_online?: boolean;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return getApiBaseUrlFromLib();
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0' : Math.round(numPrice).toLocaleString();
};

export default function HeroCards() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchFeaturedDoctors();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      // Try featured endpoint first
      const response = await api.get('/public/featured/products');
      // Axios: data is in response.data, not response.json()
      if (response.data?.success && response.data?.data?.products?.length > 0) {
        setProducts(response.data.data.products);
        setLoadingProducts(false);
        return;
      }
      // Fallback to public products endpoint - get 4 items for larger display
      const fallbackResponse = await api.get('/public/products?limit=4');
      if (fallbackResponse.data?.success) {
        setProducts(fallbackResponse.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching featured products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchFeaturedDoctors = async () => {
    try {
      // Try featured endpoint first
      const response = await api.get('/public/featured/doctors');
      // Axios: data is in response.data, not response.json()
      if (response.data?.success && response.data?.data?.doctors?.length > 0) {
        setDoctors(response.data.data.doctors);
        setLoadingDoctors(false);
        return;
      }
      // Fallback to search if no featured set - get 4 items for larger display
      const fallbackResponse = await api.get('/public/doctors/search?limit=4');
      if (fallbackResponse.data?.success) {
        setDoctors(fallbackResponse.data.data?.doctors || []);
      }
    } catch (err) {
      console.error('Error fetching featured doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleOrderClick = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!user?.is_approved && !user?.is_admin) {
      router.push('/dashboard');
      return;
    }
    router.push('/order');
  };

  const handleDoctorsClick = () => {
    router.push('/doctors');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-20">
      {/* Order Products Card - EXTRA LARGE */}
      {user?.user_type !== 'employee' && (
        <div
          onClick={handleOrderClick}
          className="group relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-[2rem] p-10 md:p-12 text-left hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer min-h-[480px] md:min-h-[550px]"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-72 h-72 border-4 border-white rounded-full" />
            <div className="absolute bottom-4 left-4 w-48 h-48 border-4 border-white rounded-full" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <ShoppingCartIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-4xl md:text-5xl font-bold text-white">
                    🛒 Order Products
                  </h3>
                  <p className="text-blue-100 text-lg md:text-xl mt-2">
                    Medical supplies delivered to your clinic
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center text-white/80 text-lg">
                <span className="mr-2">View All</span>
                <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            
            {/* Product Preview Grid - 2x2 on mobile, 4x1 larger on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 flex-1">
              {loadingProducts ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white/20 rounded-2xl h-36 md:h-44 lg:h-52 animate-pulse" />
                ))
              ) : products.length > 0 ? (
                products.slice(0, 4).map((product) => {
                  // Use the new product-images endpoint for reliable database-backed images
                  // Fallback to image_url path for backward compatibility
                  const imageUrl = product.id 
                    ? `${getApiBaseUrl()}/api/product-images/${product.id}`
                    : (product.image_url 
                        ? (product.image_url.startsWith('http') 
                            ? product.image_url 
                            : `${getApiBaseUrl()}${product.image_url}`)
                        : null);
                  
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl h-36 md:h-44 lg:h-52 overflow-hidden relative group/item hover:scale-105 transition-transform shadow-xl"
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 45vw, 200px"
                          unoptimized // Skip Next.js optimization for API-served images
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <ShoppingCartIcon className="w-14 h-14 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:p-4">
                        <span className="text-white text-lg md:text-xl font-bold">₨{formatPrice(product.price)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 md:col-span-4 text-white/70 text-center py-10 text-2xl">
                  Browse our product catalog
                </div>
              )}
            </div>
            
            {/* Order Now Button - EXTRA LARGE */}
            <button className="w-full bg-white text-blue-600 font-bold py-5 px-10 rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-4 shadow-xl text-xl">
              <ShoppingCartIcon className="w-7 h-7" />
              <span>Order Now</span>
              <ArrowRightIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Find Doctors Card - EXTRA LARGE */}
      <div
        onClick={handleDoctorsClick}
        className="group relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-[2rem] p-10 md:p-12 text-left hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer min-h-[480px] md:min-h-[550px]"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-72 h-72 border-4 border-white rounded-full" />
          <div className="absolute bottom-4 left-4 w-48 h-48 border-4 border-white rounded-full" />
        </div>
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <UserGroupIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-4xl md:text-5xl font-bold text-white">
                  👨‍⚕️ Find Doctors
                </h3>
                <p className="text-emerald-100 text-lg md:text-xl mt-2">
                  Book appointments with specialists
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center text-white/80 text-lg">
              <MapPinIcon className="w-6 h-6 mr-1" />
              <span>Find Nearby</span>
            </div>
          </div>
          
          {/* Doctor Preview Grid - 2x2 on mobile, 4x1 larger on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 flex-1">
            {loadingDoctors ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white/20 rounded-2xl h-36 md:h-44 lg:h-52 animate-pulse" />
              ))
            ) : doctors.length > 0 ? (
              doctors.slice(0, 4).map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-2xl h-36 md:h-44 lg:h-52 overflow-hidden relative group/item hover:scale-105 transition-transform shadow-xl"
                >
                  {doctor.profile_photo_url ? (
                    <Image
                      src={doctor.profile_photo_url.startsWith('http') ? doctor.profile_photo_url : `${getApiBaseUrl()}${doctor.profile_photo_url}`}
                      alt={doctor.doctor_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 45vw, 200px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-4xl md:text-5xl">
                        {doctor.doctor_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {/* Online indicator - larger */}
                  {doctor.is_online && (
                    <div className="absolute top-3 right-3 w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:p-4">
                    <span className="text-white text-lg md:text-xl font-semibold truncate block">
                      {doctor.doctor_name?.split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 md:col-span-4 text-white/70 text-center py-10 text-2xl">
                Discover doctors in your area
              </div>
            )}
          </div>
          
          {/* Find Doctors Button - EXTRA LARGE */}
          <button className="w-full bg-white text-emerald-600 font-bold py-5 px-10 rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-4 shadow-xl text-xl">
            <UserGroupIcon className="w-7 h-7" />
            <span>Find a Doctor</span>
            <ArrowRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

