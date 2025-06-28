import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, TrendingUp, Shield } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-cream-50 to-secondary-50">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <img
            src="/image copy copy.png"
            alt="FlareTracker Logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-xl font-bold text-neutral-800">FlareTracker</span>
        </div>
        <Link
          to="/login"
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/image copy copy.png"
            alt="FlareTracker Logo"
            className="w-32 h-32 mx-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Coming Soon Message */}
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-neutral-800 mb-6">
            FlareTracker
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 mb-8 leading-relaxed">
            Advanced skin health analytics platform
          </p>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-neutral-200 mb-8">
            <h2 className="text-2xl font-semibold text-primary-600 mb-4">
              Coming Soon
            </h2>
            <p className="text-neutral-700 text-lg leading-relaxed">
              We're putting the finishing touches on the most comprehensive skin health tracking platform. 
              Get ready to transform how you monitor and understand your skin conditions.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-neutral-200">
              <Calendar className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h3 className="font-semibold text-neutral-800 mb-2">Smart Tracking</h3>
              <p className="text-sm text-neutral-600">Daily check-ins with intelligent pattern recognition</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-neutral-200">
              <TrendingUp className="w-8 h-8 text-accent-500 mx-auto mb-3" />
              <h3 className="font-semibold text-neutral-800 mb-2">AI Insights</h3>
              <p className="text-sm text-neutral-600">Personalized analysis and trend identification</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-neutral-200">
              <Shield className="w-8 h-8 text-secondary-500 mx-auto mb-3" />
              <h3 className="font-semibold text-neutral-800 mb-2">Healthcare Ready</h3>
              <p className="text-sm text-neutral-600">Professional reports for your medical team</p>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <span>Get Early Access</span>
              <ArrowRight size={20} />
            </Link>
            
            <p className="text-sm text-neutral-500">
              Join the beta program and be among the first to experience FlareTracker
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 px-4 border-t border-neutral-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          {/* Built with Bolt Badge */}
          <div className="flex justify-center mb-4">
            <a
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-sm font-medium">Built with Bolt</span>
            </a>
          </div>
          
          <p className="text-neutral-600 text-sm">
            © 2025 FlareTracker. Advanced skin health analytics.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;