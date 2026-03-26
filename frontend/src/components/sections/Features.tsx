'use client';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

export function Features() {
  const features: Feature[] = [
    {
      id: '1',
      title: 'Product Ordering',
      description: 'Browse and order from our extensive catalog of medical supplies and equipment.',
      icon: '🛒',
      benefits: [
        '100+ Product Slots',
        'Real-time Inventory',
        'Bulk Ordering Options',
        'Fast Delivery'
      ]
    },
    {
      id: '2',
      title: 'Leaderboard System',
      description: 'Track your clinic\'s performance and compete with other medical professionals.',
      icon: '🏆',
      benefits: [
        'Tier-based Rankings',
        'Monthly Competitions',
        'Achievement Badges',
        'Progress Tracking'
      ]
    },
    {
      id: '3',
      title: 'Research Papers',
      description: 'Share and discover cutting-edge medical research from fellow professionals.',
      icon: '📚',
      benefits: [
        'Peer Review System',
        'Citation Management',
        'Upvote System',
        'Knowledge Sharing'
      ]
    },
    {
      id: '4',
      title: 'Hall of Pride',
      description: 'Celebrate exceptional achievements and contributions to the medical community.',
      icon: '⭐',
      benefits: [
        'Recognition Program',
        'Featured Profiles',
        'Achievement Showcase',
        'Community Awards'
      ]
    },
    {
      id: '5',
      title: 'Admin Management',
      description: 'Comprehensive admin tools for managing users, products, and platform operations.',
      icon: '⚙️',
      benefits: [
        'User Approval System',
        'Product Management',
        'Order Processing',
        'Analytics Dashboard'
      ]
    },
    {
      id: '6',
      title: 'Secure Platform',
      description: 'Enterprise-grade security with doctor-only access and data protection.',
      icon: '🔒',
      benefits: [
        'JWT Authentication',
        'Role-based Access',
        'Data Encryption',
        'Privacy Compliance'
      ]
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container-responsive">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Platform Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to manage your clinic and connect with the medical community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="group card hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-body text-center">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-6">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3"></div>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-gradient-primary rounded-2xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">100+</div>
              <div className="text-primary-100">Product Slots</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-primary-100">Active Doctors</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">1000+</div>
              <div className="text-primary-100">Orders Processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50+</div>
              <div className="text-primary-100">Research Papers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
