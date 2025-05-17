import React, { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/Layout';
import UsersPage from './pages/UsersPage';
import PetsPage from './pages/PetsPage';
import TemperaturePage from './pages/TemperaturePage';
import ProfilePage from './pages/ProfilePage';
import { Route } from './types';

function App() {
  const { currentUser, currentRoute, setCurrentRoute } = useAuth();
  
  useEffect(() => {
    // Set default route when user logs in
    if (currentUser && currentRoute === Route.AUTH) {
      setCurrentRoute(Route.DASHBOARD);
    }
  }, [currentUser, currentRoute, setCurrentRoute]);

  if (!currentUser) {
    return <AuthPage />;
  }

  // Render content based on current route
  const renderContent = () => {
    switch (currentRoute) {
      case Route.DASHBOARD:
        return <Dashboard />;
      case Route.USERS:
        return <UsersPage />;
      case Route.PETS:
        return <PetsPage />;
      case Route.TEMPERATURE:
        return <TemperaturePage />;
      case Route.PROFILE:
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
}

export default App;
