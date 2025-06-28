import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  TrendingUp, 
  Pill, 
  Layers, 
  Settings,
  Bell,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useApp();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/check-in':
        return 'Daily Check-In';
      case '/trends':
        return 'Trends & Analysis';
      case '/conditions':
        return 'My Conditions';
      case '/medications':
        return 'My Medications';
      case '/settings':
        return 'Settings';
      default:
        if (location.pathname.startsWith('/conditions/')) {
          return 'Condition Details';
        }
        return 'FlareTracker';
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-3 p-4 ${
      isActive 
        ? 'bg-primary-100 text-primary-700 font-medium' 
        : 'text-neutral-600 hover:bg-neutral-100'
    }`;

  return (
    <header className="bg-white border-b border-neutral-200 py-3 px-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4 text-neutral-600 focus:outline-none" 
            onClick={toggleMobileMenu}
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold text-neutral-800">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-neutral-600 hover:text-primary-500 transition-colors duration-200">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-medium">
              {(user?.name || 'U').toUpperCase().charAt(0)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900 bg-opacity-50 md:hidden">
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <Logo size="md" />
              <button 
                className="text-neutral-600 focus:outline-none" 
                onClick={closeMobileMenu}
              >
                <X size={24} />
              </button>
            </div>
            
            <nav className="mt-2">
              <NavLink to="/dashboard" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <Home size={20} />
                <span>Dashboard</span>
              </NavLink>
              
              <NavLink to="/check-in" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <Calendar size={20} />
                <span>Daily Check-In</span>
              </NavLink>
              
              <NavLink to="/trends" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <TrendingUp size={20} />
                <span>Trends</span>
              </NavLink>
              
              <NavLink to="/conditions" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <Layers size={20} />
                <span>Conditions</span>
              </NavLink>
              
              <NavLink to="/medications" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <Pill size={20} />
                <span>Medications</span>
              </NavLink>
              
              <NavLink to="/settings" className={mobileNavLinkClasses} onClick={closeMobileMenu}>
                <Settings size={20} />
                <span>Settings</span>
              </NavLink>
              
              <button 
                onClick={() => {
                  handleSignOut();
                  closeMobileMenu();
                }}
                className="w-full flex items-center space-x-3 p-4 text-neutral-600 hover:bg-neutral-100"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;