import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, LayoutDashboard, Users, PawPrint as Pawprint, Thermometer, LogOut, UserCircle, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Route } from '../../types';
import { supabase } from '../../utils/supabase';
import { Alert } from '../../types';

const TopBar = () => {
  const { currentUser, currentRoute, setCurrentRoute, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch alerts and set up real-time subscription
  useEffect(() => {
    // Fetch initial alerts
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        // Map database entries to Alert type
        const formattedAlerts: Alert[] = (data || []).map(item => ({
          id: item.id,
          message: item.message,
          type: item.type || 'info',
          timestamp: new Date(item.created_at),
        }));
        
        setAlerts(formattedAlerts);
        
        // Count unread alerts
        const unread = data?.filter(alert => !alert.resolved)?.length || 0;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching alerts:', err);
      }
    };

    fetchAlerts();

    // Subscribe to real-time updates for alerts
    const alertsSubscription = supabase
      .channel('alerts-channel-topbar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert: Alert = {
            id: payload.new.id,
            message: payload.new.message,
            type: payload.new.type || 'info',
            timestamp: new Date(payload.new.created_at)
          };
          
          // Add new alert to the beginning of the list
          setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
          
          // Increment unread count
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(alertsSubscription);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  const toggleNotifications = () => {
    setNotificationOpen(!notificationOpen);
    // Mark as read when opening
    if (!notificationOpen) {
      setUnreadCount(0);
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch(type) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': 
      default: return 'bg-blue-500';
    }
  };

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

  // Title based on current route
  const getRouteTitle = () => {
    switch (currentRoute) {
      case Route.DASHBOARD: return 'Dashboard';
      case Route.USERS: return 'User Management';
      case Route.PETS: return 'Pet Management';
      case Route.PET_MONITOR: return 'Pet Monitoring';
      case Route.TEMPERATURE: return 'Temperature Data';
      case Route.PROFILE: return 'Your Profile';
      default: return 'Dashboard';
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
            {getRouteTitle()}
          </h1>
          
          {/* Mobile Title */}
          <div className="flex items-center md:hidden">
            <Pawprint className="h-6 w-6 text-primary-600 mr-2" />
            <h1 className="text-lg font-bold text-gray-900">PAW SAFE</h1>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 focus:outline-none relative"
                onClick={toggleNotifications}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications dropdown */}
              {notificationOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
                  </div>
                  
                  {alerts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {alerts.map(alert => (
                        <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 rounded-full h-2 w-2 mt-2 mr-3 ${getAlertTypeColor(alert.type)}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {alert.timestamp.toLocaleTimeString()} - {alert.timestamp.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button 
                      onClick={() => setCurrentRoute(Route.DASHBOARD)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <div 
                className="flex items-center cursor-pointer"
                onClick={toggleUserMenu}
              >
                <div className="flex-shrink-0">
                  {currentUser?.avatar ? (
                    <img
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                      src={currentUser.avatar}
                      alt={currentUser.fullName || currentUser.username}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      <UserCircle className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="ml-2 hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{currentUser?.fullName || currentUser?.username}</p>
                  <p className="text-xs text-gray-500">{currentUser?.role}</p>
                </div>
              </div>
              
              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1 rounded-md bg-white shadow-xs">
                    <button
                      onClick={() => {
                        setCurrentRoute(Route.PROFILE);
                        setUserMenuOpen(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Your Profile
                    </button>
                    
                    <button
                      onClick={async () => {
                        await logout();
                        setUserMenuOpen(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Sign Out Button */}
            <button
              onClick={logout}
              className="md:hidden flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-full h-8 w-8"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 md:hidden">
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-lg">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <div className="flex items-center">
                <Pawprint className="h-6 w-6 text-primary-600 mr-2" />
                <h1 className="text-lg font-bold text-gray-900">PAW SAFE</h1>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={toggleMobileMenu}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex flex-col h-full py-4">
              <nav className="space-y-1 px-3">
                {menuItems.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => {
                      setCurrentRoute(item.route);
                      setMobileMenuOpen(false);
                    }}
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
                
                {/* Profile in mobile menu */}
                <button
                  onClick={() => {
                    setCurrentRoute(Route.PROFILE);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md w-full transition-colors duration-150 ${
                    currentRoute === Route.PROFILE
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3"><UserCircle className="h-5 w-5" /></span>
                  Your Profile
                </button>
              </nav>
              
              <div className="px-3 mt-auto">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;




