import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary-50 via-cream-50 to-secondary-50">
        <div className="text-center">
          <img
            src="/image copy copy.png"
            alt="FlareTracker Logo"
            className="w-16 h-16 mx-auto object-contain mb-4 animate-pulse"
          />
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading FlareTracker...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;