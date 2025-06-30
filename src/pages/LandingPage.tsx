import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, TrendingUp, Shield } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-cream-50 to-secondary-50">
      {/* Floating Bolt Logo */}
      <div className="fixed top-6 right-6 z-50">
        <a href="https://bolt.new/">
        <img
          src="/bolt.png"
          alt="Built with Bolt"
          className="w-12 h-12 object-contain opacity-80 hover:opacity-100 transition-opacity duration-200 drop-shadow-lg"
        />
          </a>
      </div>

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

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 px-4 border-t border-neutral-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <p className="text-neutral-600 text-sm">
            © 2025 FlareTracker. Advanced skin health analytics.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;