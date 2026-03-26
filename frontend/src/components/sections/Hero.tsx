'use client';

interface HeroProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function Hero({ onLoginClick, onRegisterClick }: HeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-primary-100 py-20 lg:py-32">
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Content */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional{' '}
            <span className="text-gradient">B2B Platform</span>
            <br />
            for Clinics
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with fellow doctors, order medical supplies, share research, 
            and track your clinic's performance on our exclusive platform.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onRegisterClick}
              className="btn-primary btn-lg px-8 py-4 text-lg font-semibold shadow-glow"
            >
              Join as Doctor
            </button>
            
            <button
              onClick={onLoginClick}
              className="btn-outline btn-lg px-8 py-4 text-lg font-semibold"
            >
              Sign In
            </button>
          </div>
          
          {/* WhatsApp Support */}
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-bold text-sm">📱</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">Need Help?</p>
                <a 
                  href="https://wa.me/923251531780" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Contact us on WhatsApp: +92 325 1531780
                </a>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Trusted by medical professionals</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Medical Center</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Health Clinic</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Care Center</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-subtle"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-bounce-subtle" style={{ animationDelay: '2s' }}></div>
      </div>
    </section>
  );
}
