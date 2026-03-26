'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/sections/Hero';
import { PinnedProfiles } from '@/components/sections/PinnedProfiles';
import { ClinicCards } from '@/components/sections/ClinicCards';
import { Features } from '@/components/sections/Features';
import { Footer } from '@/components/layout/Footer';
import { LoginModal } from '@/components/modals/LoginModal';
import { RegisterModal } from '@/components/modals/RegisterModal';

export function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Clear all authentication data when visiting landing page
  useEffect(() => {
    // Clear all auth data to prevent any redirects
    logout();
    localStorage.clear();
    sessionStorage.clear();
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('Landing page loaded - all auth data cleared');
  }, [logout]);

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  const handleRegisterClick = () => {
    setShowRegisterModal(true);
  };

  const handleCloseModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
        isAuthenticated={isAuthenticated}
        user={user}
      />
      
      <main>
        <Hero 
          onLoginClick={handleLoginClick}
          onRegisterClick={handleRegisterClick}
        />
        
        <PinnedProfiles />
        
        <ClinicCards />
        
        <Features />
      </main>
      
      <Footer />
      
      {/* Modals */}
      {showLoginModal && (
        <LoginModal 
          isOpen={showLoginModal}
          onClose={handleCloseModals}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      )}
      
      {showRegisterModal && (
        <RegisterModal 
          isOpen={showRegisterModal}
          onClose={handleCloseModals}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      )}
    </div>
  );
}
