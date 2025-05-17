import React from 'react';
import { LayoutDashboard, Users, PawPrint as Pawprint, Thermometer, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Route } from '../../types';

const Sidebar = () => {
  const { currentRoute, setCurrentRoute, logout } = useAuth();

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="h-5 w-5" />, 
      route: Route.DASHBOARD 
    },
    { 
      label: 'Users', 
      icon: <Users className="h-5 w-5" />, 
      route: Route.USERS 
    },
    { 
      label: 'Pets', 
      icon: <Pawprint className="h-5 w-5" />, 
      route: Route.PETS 
    },
    { 
      label: 'Pet Monitor', 
      icon: <Activity className="h-5 w-5" />, 
      route: Route.PET_MONITOR 
    },
    { 
      label: 'Temperature', 
      icon: <Thermometer className="h-5 w-5" />, 
      route: Route.TEMPERATURE 
    },
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Pawprint className="h-8 w-8 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">PAW SAFE</h1>
        </div>
      </div>
      
      <div className="flex flex-col justify-between h-full py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <button
              key={item.route}
              onClick={() => setCurrentRoute(item.route)}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-md w-full transition-colors duration-150 ${
                currentRoute === item.route
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="px-4 mt-auto">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
