import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle, Loader, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !formData.name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        await signUp(formData.email, formData.password, formData.name);
        setSuccess('Account created successfully! Welcome to FlareTracker.');
      } else {
        await signIn(formData.email, formData.password);
        setSuccess('Welcome back!');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setSuccess(null);
  };

  // Check if this looks like a configuration issue
  const isConfigurationError = error?.includes('Supabase configuration') || 
                               error?.includes('Unable to connect to Supabase') ||
                               error?.includes('Invalid API key') ||
                               error?.includes('Project not found');

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" variant="icon" />
          </div>
          <Logo variant="text" size="xl" className="justify-center mb-2" />
          <p className="text-neutral-600">
            {mode === 'signin' ? 'Welcome back!' : 'Advanced skin health analytics'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
          {/* Status Messages */}
          {error && (
            <div className={`mb-6 border rounded-lg p-4 flex items-start ${
              isConfigurationError 
                ? 'bg-warning-50 border-warning-200' 
                : 'bg-error-50 border-error-200'
            }`}>
              {isConfigurationError ? (
                <AlertTriangle className="text-warning-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <XCircle className="text-error-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
              )}
              <div>
                <span className={`text-sm ${
                  isConfigurationError ? 'text-warning-700' : 'text-error-700'
                }`}>
                  {error}
                </span>
                {isConfigurationError && (
                  <div className="mt-2 text-xs text-warning-600">
                    <p>Please ensure:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Your .env file contains valid Supabase credentials</li>
                      <li>Your Supabase project is active and accessible</li>
                      <li>Your internet connection is stable</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-success-50 border border-success-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="text-success-500 mr-3 flex-shrink-0" size={20} />
              <span className="text-success-700 text-sm">{success}</span>
            </div>
          )}

          {/* First Time User Info */}
          {mode === 'signin' && !error && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
              <Info className="text-blue-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">First time here?</p>
                <p>If you don't have an account yet, click "Sign Up" to create one. Make sure to use a valid email address.</p>
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-neutral-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-neutral-500">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader className="animate-spin mr-2" size={20} />
              ) : (
                <Logo variant="icon" size="sm" className="mr-2" />
              )}
              {loading 
                ? 'Please wait...' 
                : mode === 'signin' 
                  ? 'Sign In' 
                  : 'Create Account'
              }
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500 mb-4">Advanced skin analytics with:</p>
          <div className="flex justify-center space-x-6 text-xs text-neutral-600">
            <span>📊 Smart Tracking</span>
            <span>📈 AI Insights</span>
            <span>💊 Treatment Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;