'use client';

import { useState, useEffect } from 'react';
import { PhoneIcon } from '@heroicons/react/24/outline';

interface ContactInfo {
  whatsapp: string;
  gmail: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  tiktok: string;
}

export default function ContactInfoSection() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    whatsapp: '+92 325 1531780',
    gmail: 'asadkhanbloch4949@gmail.com',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    tiktok: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      // Use centralized API instance
      const { default: api } = await import('@/lib/api');
      const response = await api.get('/contact-info');
      
      if (response.data.success) {
        setContactInfo(response.data.data || contactInfo);
      }
    } catch (error: unknown) {
      console.error('Error fetching contact info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-4 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-3 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">For any info contact</p>
              <div className="flex items-center justify-center space-x-2 group cursor-pointer">
                <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-bold text-xs">📱</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-800 group-hover:hidden">
                    Contact
                  </span>
                  <a 
                    href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors hidden group-hover:block"
                  >
                    {contactInfo.whatsapp}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
