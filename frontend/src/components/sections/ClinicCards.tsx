'use client';

import { useState, useEffect } from 'react';

interface ClinicCard {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  features: string[];
  stats: {
    label: string;
    value: string;
  }[];
}

export function ClinicCards() {
  const [cards, setCards] = useState<ClinicCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching clinic cards
    const fetchCards = async () => {
      try {
        // Mock data - in real app, this would come from API
        const mockCards: ClinicCard[] = [
          {
            id: '1',
            title: 'Metro Medical Center',
            description: 'Leading healthcare provider with state-of-the-art facilities and expert medical professionals.',
            features: [
              '24/7 Emergency Services',
              'Advanced Diagnostic Equipment',
              'Specialized Medical Departments',
              'Patient-Centered Care'
            ],
            stats: [
              { label: 'Years of Service', value: '25+' },
              { label: 'Patients Served', value: '50K+' },
              { label: 'Medical Staff', value: '150+' },
              { label: 'Departments', value: '12' }
            ]
          },
          {
            id: '2',
            title: 'City Health Clinic',
            description: 'Community-focused healthcare center providing comprehensive medical services to urban populations.',
            features: [
              'Primary Care Services',
              'Preventive Medicine',
              'Health Education Programs',
              'Affordable Healthcare'
            ],
            stats: [
              { label: 'Years of Service', value: '15+' },
              { label: 'Patients Served', value: '30K+' },
              { label: 'Medical Staff', value: '80+' },
              { label: 'Departments', value: '8' }
            ]
          },
          {
            id: '3',
            title: 'Community Care Center',
            description: 'Dedicated to providing accessible and quality healthcare services to the local community.',
            features: [
              'Family Medicine',
              'Pediatric Care',
              'Mental Health Services',
              'Community Outreach'
            ],
            stats: [
              { label: 'Years of Service', value: '10+' },
              { label: 'Patients Served', value: '20K+' },
              { label: 'Medical Staff', value: '45+' },
              { label: 'Departments', value: '6' }
            ]
          }
        ];
        
        setCards(mockCards);
      } catch (error: unknown) {
        console.error('Failed to fetch clinic cards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading clinic information...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container-responsive">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Our Partner Clinics
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the exceptional healthcare providers that make our platform great
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="card hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Card Header */}
              <div className="card-header">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-600">
                      {card.title.split(' ').map(word => word[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {card.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <p className="text-gray-600 mb-6">
                  {card.description}
                </p>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Key Features
                  </h4>
                  <ul className="space-y-2">
                    {card.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {card.stats.map((stat, statIndex) => (
                    <div key={statIndex} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="card-footer">
                <button className="btn-outline w-full">
                  Learn More
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Join Us CTA */}
        <div className="text-center mt-12">
          <div className="bg-white rounded-lg p-8 shadow-soft">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Want to Join Our Network?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Become part of our exclusive B2B platform and connect with fellow medical professionals.
            </p>
            <button className="btn-primary btn-lg">
              Register Your Clinic
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
