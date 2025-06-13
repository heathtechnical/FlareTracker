import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  TrendingUp, 
  Pill, 
  Layers, 
  Settings,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';

const Sidebar: React.FC = () => {
  const { signOut } = useApp();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-primary-100 text-primary-700 font-medium' 
        : 'text-neutral-600 hover:bg-neutral-100'
    }`;

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-neutral-200 p-4">
      <div className="flex items-center mb-8 px-2">
        <Logo size="lg" />
      </div>
      
      <nav className="flex-1 space-y-1">
        <NavLink to="/dashboard" className={navLinkClasses}>
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/check-in" className={navLinkClasses}>
          <Calendar size={20} />
          <span>Daily Check-In</span>
        </NavLink>
        
        <NavLink to="/trends" className={navLinkClasses}>
          <TrendingUp size={20} />
          <span>Trends</span>
        </NavLink>
        
        <NavLink to="/conditions" className={navLinkClasses}>
          <Layers size={20} />
          <span>Conditions</span>
        </NavLink>
        
        <NavLink to="/medications" className={navLinkClasses}>
          <Pill size={20} />
          <span>Medications</span>
        </NavLink>
        
      </nav>
      
      <div className="mt-auto pt-4 border-t border-neutral-200 space-y-1">
        <NavLink to="/settings" className={navLinkClasses}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center space-x-3 p-3 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-all duration-200"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;