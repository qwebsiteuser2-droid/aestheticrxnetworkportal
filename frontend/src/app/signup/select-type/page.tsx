'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SelectUserTypePage() {
  const router = useRouter();

  const handleUserTypeSelect = (userType: 'doctor' | 'regular_user' | 'employee') => {
    router.push(`/signup?type=${userType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Account Type
            </h1>
            <p className="text-lg text-gray-600">
              Select the type of account you want to create
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {/* Doctor Option */}
            <div
              onClick={() => handleUserTypeSelect('doctor')}
              className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-white"
            >
              <div className="text-center">
                <div className="text-5xl mb-4">👨‍⚕️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Doctor</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For medical professionals and clinic owners
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2 mb-4">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Access to ordering system</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Leaderboard & rankings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Certificates & achievements</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Research papers</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <span className="text-xs text-blue-600 font-medium">Requires Signup ID</span>
                </div>
              </div>
            </div>

            {/* Regular User Option */}
            <div
              onClick={() => handleUserTypeSelect('regular_user')}
              className="border-2 border-green-200 rounded-xl p-6 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-green-50 to-white"
            >
              <div className="text-center">
                <div className="text-5xl mb-4">🛒</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Regular User</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For customers who want to order products
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2 mb-4">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Access to ordering system</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">✗</span>
                    <span className="text-gray-500">No leaderboard</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">✗</span>
                    <span className="text-gray-500">No certificates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-2">✗</span>
                    <span className="text-gray-500">No rankings</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <span className="text-xs text-green-600 font-medium">No Signup ID Required</span>
                </div>
              </div>
            </div>

            {/* Employee Option */}
            <div
              onClick={() => handleUserTypeSelect('employee')}
              className="border-2 border-purple-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-white"
            >
              <div className="text-center">
                <div className="text-5xl mb-4">🚚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Employee / Delivery</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For delivery personnel and company employees
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2 mb-4">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>View assigned orders</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Accept delivery tasks</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Track deliveries</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Mark as delivered</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <span className="text-xs text-purple-600 font-medium">No Signup ID Required</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
