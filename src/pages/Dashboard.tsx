import React, { useState, useEffect } from 'react';
import { 
  Dog, 
  Cat, 
  Stethoscope,
  ArrowUp,
  ArrowDown,
  Clock,
  User,
  Shield,
  Bookmark,
  WifiOff
} from 'lucide-react';
import { MetricCard, Alert, Activity, Route } from '../types';
import SensorCard from '../components/SensorCard';
import useSensorData from '../hooks/useSensorData';
import useActivitiesAndAlerts from '../hooks/useActivitiesAndAlerts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

// Define interfaces for database data
interface PetBreedCount {
  breed: string;
  count: number;
}

interface PregnantPet {
  id: string;
  name: string;
  breed: string;
  animal_type: string;
  due_date?: string;
  notes?: string;
}

interface StaffCount {
  role: string;
  count: number;
}

const Dashboard = () => {
  // Get real sensor data from Supabase
  const { temperature, humidity, lastUpdated, tempUpdated, humUpdated } = useSensorData();
  
  // Get real activities and alerts data
  const { activities, alerts, loading: activitiesLoading } = useActivitiesAndAlerts();
  
  // Add state for ESP8266 status
  const [espStatus, setEspStatus] = useState<'online' | 'offline'>('online');
  const [lastDataCheck, setLastDataCheck] = useState<Date | null>(null);
  
  // Replace fake data with state for real data
  const [petStats, setPetStats] = useState({
    dogCount: 0,
    catCount: 0,
    pregnantCount: 0,
    dogBreeds: [] as PetBreedCount[],
    catBreeds: [] as PetBreedCount[],
    pregnantPets: [] as PregnantPet[],
  });
  
  const [staffStats, setStaffStats] = useState({
    totalUsers: 0,
    byRole: [] as StaffCount[]
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(new Date());
  const { currentUser, logout, setCurrentRoute, users } = useAuth();

  // Check if ESP8266 is offline (no data updates in 1 minute)
  useEffect(() => {
    // Initialize last data check time if lastUpdated exists
    if (lastUpdated && !lastDataCheck) {
      setLastDataCheck(new Date(lastUpdated));
      setEspStatus('online');
    }
    
    // Set up interval to check ESP status every 10 seconds
    const checkInterval = setInterval(() => {
      if (lastUpdated) {
        const lastUpdateTime = new Date(lastUpdated);
        const currentTime = new Date();
        const diffInSeconds = (currentTime.getTime() - lastUpdateTime.getTime()) / 1000;
        
        // If no updates in 60 seconds (1 minute), consider ESP offline
        if (diffInSeconds > 60) {
          setEspStatus('offline');
          
          // Create an alert if status changed from online to offline
          if (espStatus === 'online') {
            createOfflineAlert();
          }
        } else {
          setEspStatus('online');
        }
        
        setLastDataCheck(currentTime);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkInterval);
  }, [lastUpdated, espStatus]);
  
  // Function to create an offline alert
  const createOfflineAlert = async () => {
    try {
      // Insert alert directly into the alerts table
      const { error } = await supabase
        .from('alerts')
        .insert({
          type: 'warning',
          message: 'ESP8266 microcontroller appears to be offline. No sensor data updates in the last minute.',
          source: 'system'
        });
        
      if (error) {
        console.error('Error creating offline alert:', error);
      }
    } catch (err) {
      console.error('Failed to create offline alert:', err);
    }
  };

  // Fetch pet data from Supabase
  useEffect(() => {
    async function fetchPetData() {
      setLoading(true);
      
      try {
        // Get dog count and breeds
        const { data: dogs, error: dogsError } = await supabase
          .from('pets')
          .select('id, breed')
          .eq('type', 'Dog');
        
        if (dogsError) throw dogsError;
        
        // Get cat count and breeds
        const { data: cats, error: catsError } = await supabase
          .from('pets')
          .select('id, breed')
          .eq('type', 'Cat');
        
        if (catsError) throw catsError;
        
        // Get pregnant pets - fixed the query to match the schema
        const { data: pregnant, error: pregnantError } = await supabase
          .from('pets')
          .select('id, name, breed, type')
          .eq('is_pregnant', true);
        
        if (pregnantError) throw pregnantError;
        
        // Process dog breeds
        const dogBreeds: PetBreedCount[] = [];
        const dogBreedMap = new Map<string, number>();
        
        dogs.forEach(dog => {
          const breed = dog.breed || 'Unknown';
          dogBreedMap.set(breed, (dogBreedMap.get(breed) || 0) + 1);
        });
        
        dogBreedMap.forEach((count, breed) => {
          dogBreeds.push({ breed, count });
        });
        
        // Process cat breeds
        const catBreeds: PetBreedCount[] = [];
        const catBreedMap = new Map<string, number>();
        
        cats.forEach(cat => {
          const breed = cat.breed || 'Unknown';
          catBreedMap.set(breed, (catBreedMap.get(breed) || 0) + 1);
        });
        
        catBreedMap.forEach((count, breed) => {
          catBreeds.push({ breed, count });
        });
        
        // Sort breeds by count
        dogBreeds.sort((a, b) => b.count - a.count);
        catBreeds.sort((a, b) => b.count - a.count);
        
        // Format the pregnant pets to match the expected interface
        const formattedPregnantPets = pregnant.map(pet => ({
          id: pet.id,
          name: pet.name,
          breed: pet.breed,
          animal_type: pet.type, // Map 'type' to 'animal_type'
        }));
        
        setPetStats({
          dogCount: dogs.length,
          catCount: cats.length,
          pregnantCount: pregnant.length,
          dogBreeds: dogBreeds,
          catBreeds: catBreeds,
          pregnantPets: formattedPregnantPets,
        });
      } catch (error) {
        console.error('Error fetching pet data:', error);
        // Keep default values in case of error
      }
    }
    
    fetchPetData();
  }, []);

  // Process staff data from AuthContext instead of directly querying DB
  useEffect(() => {
    if (users && users.length > 0) {
      // Count staff by role
      const roleMap = new Map<string, number>();
      
      users.forEach(user => {
        const role = user.role || 'Unknown';
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
      
      const roleStats: StaffCount[] = [];
      roleMap.forEach((count, role) => {
        roleStats.push({ role, count });
      });
      
      setStaffStats({
        totalUsers: users.length,
        byRole: roleStats,
      });
    } else {
      setStaffStats({
        totalUsers: 0,
        byRole: []
      });
    }
    
    setLoading(false);
  }, [users]);

  // Metrics cards data - now with real data
  const metrics: MetricCard[] = [
    {
      title: 'Dogs',
      value: petStats.dogCount,
      icon: <Dog className="h-6 w-6" />,
      color: 'bg-green-50 text-green-700',
      details: `${petStats.dogBreeds.length} breeds`,
    },
    {
      title: 'Cats',
      value: petStats.catCount,
      icon: <Cat className="h-6 w-6" />,
      color: 'bg-purple-50 text-purple-700',
      details: `${petStats.catBreeds.length} breeds`,
    },
    {
      title: 'Pregnant',
      value: petStats.pregnantCount,
      icon: <Stethoscope className="h-6 w-6" />,
      color: 'bg-pink-50 text-pink-700',
      details: petStats.pregnantPets.length > 0 
        ? `${petStats.pregnantPets.filter(p => p.animal_type === 'Dog').length} dogs, ${petStats.pregnantPets.filter(p => p.animal_type === 'Cat').length} cats` 
        : 'None currently',
    },
    {
      title: 'Staff',
      value: staffStats.totalUsers,
      icon: <User className="h-6 w-6" />,
      color: 'bg-blue-50 text-blue-700',
      details: staffStats.byRole.map(r => `${r.count} ${r.role}`).join(', '),
    },
  ];

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSignOut = async () => {
    await logout();
  };
  
  // Navigate to pets page
  const navigateToPets = () => {
    setCurrentRoute(Route.PETS);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>
          <div className="mt-2 sm:mt-0 flex items-center space-x-2 text-sm">
            <span>Welcome, {currentUser?.fullName || 'Admin'}</span>
            <button 
              className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-md text-sm"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1">
          <p className="text-sm text-gray-500">
            Here's what's happening in your facility.
          </p>
          <div className="mt-2 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatDate(currentTime)}</span>
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* ESP8266 Status Alert */}
      {espStatus === 'offline' && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-700">
                ESP8266 Microcontroller Offline
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                No sensor data updates in the last minute. Please check the device.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SensorCard
          title="Temperature"
          value={temperature}
          unit="°C"
          type="temperature"
          isUpdated={tempUpdated}
          isOffline={espStatus === 'offline'}
        />
        
        <SensorCard
          title="Humidity" 
          value={humidity}
          unit="%"
          type="humidity"
          isUpdated={humUpdated}
          isOffline={espStatus === 'offline'}
        />
      </div>
      
      {lastUpdated && (
        <div className="text-xs text-gray-500 mb-6 flex items-center">
          <span>Last sensor update: {lastUpdated}</span>
          {espStatus === 'online' && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              ESP8266 Online
            </span>
          )}
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`${metric.color} rounded-lg shadow-sm p-4 transition-transform duration-200 hover:shadow-md hover:scale-105`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium opacity-80">{metric.title}</p>
                <p className="text-2xl font-bold mt-1">{loading ? '...' : metric.value}</p>
                
                {metric.details && (
                  <div className="flex items-center mt-1 text-xs">
                    <span>{loading ? 'Loading...' : metric.details}</span>
                  </div>
                )}
              </div>
              <div className="p-2 rounded-full bg-white bg-opacity-30">
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Pet Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Breed Breakdown */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Breed Breakdown</h3>
            <button 
              onClick={navigateToPets}
              className="text-xs text-primary-600 hover:underline flex items-center"
            >
              <span>View all</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-center text-gray-500">Loading breed data...</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center mb-2">
                    <Dog className="h-4 w-4 mr-2 text-green-600" />
                    <h4 className="font-medium text-sm">Dog Breeds</h4>
                  </div>
                  {petStats.dogBreeds.length === 0 ? (
                    <p className="text-sm text-gray-500">No dogs registered</p>
                  ) : (
                    <ul className="text-sm">
                      {petStats.dogBreeds.slice(0, 5).map((breed, idx) => (
                        <li key={idx} className="flex justify-between py-1">
                          <span>{breed.breed}</span>
                          <span className="font-medium">{breed.count}</span>
                        </li>
                      ))}
                      {petStats.dogBreeds.length > 5 && (
                        <li className="text-xs text-gray-500 pt-1">
                          +{petStats.dogBreeds.length - 5} more breeds
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Cat className="h-4 w-4 mr-2 text-purple-600" />
                    <h4 className="font-medium text-sm">Cat Breeds</h4>
                  </div>
                  {petStats.catBreeds.length === 0 ? (
                    <p className="text-sm text-gray-500">No cats registered</p>
                  ) : (
                    <ul className="text-sm">
                      {petStats.catBreeds.slice(0, 5).map((breed, idx) => (
                        <li key={idx} className="flex justify-between py-1">
                          <span>{breed.breed}</span>
                          <span className="font-medium">{breed.count}</span>
                        </li>
                      ))}
                      {petStats.catBreeds.length > 5 && (
                        <li className="text-xs text-gray-500 pt-1">
                          +{petStats.catBreeds.length - 5} more breeds
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Pregnant Pets */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Pregnant Pets</h3>
          </div>
          <div className="p-4">
            {loading ? (
              <p className="text-center text-gray-500">Loading data...</p>
            ) : petStats.pregnantPets.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pregnant pets currently</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {petStats.pregnantPets.slice(0, 5).map((pet) => (
                  <li key={pet.id} className="py-3">
                    <div className="flex items-start">
                      {pet.animal_type === 'Dog' ? (
                        <Dog className="h-4 w-4 mr-2 mt-1 text-green-600" />
                      ) : (
                        <Cat className="h-4 w-4 mr-2 mt-1 text-purple-600" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{pet.name}</p>
                        <p className="text-xs text-gray-600">{pet.breed}</p>
                        {pet.due_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due date: {new Date(pet.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                {petStats.pregnantPets.length > 5 && (
                  <li className="text-center text-xs text-gray-500 py-2">
                    +{petStats.pregnantPets.length - 5} more pregnant pets
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Recent Alerts</h3>
          </div>
          <div className="p-4">
            {activitiesLoading ? (
              <p className="text-gray-500 text-center py-4">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No alerts at this time</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id} className="py-3">
                    <div className="flex items-start">
                      <div 
                        className={`flex-shrink-0 rounded-full h-2 w-2 mt-2 mr-3 ${
                          alert.type === 'info' 
                            ? 'bg-blue-500' 
                            : alert.type === 'warning' 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.timestamp.toLocaleTimeString()} - {alert.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Recent Activity</h3>
          </div>
          <div className="p-4">
            {activitiesLoading ? (
              <p className="text-gray-500 text-center py-4">Loading activities...</p>
            ) : activities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {activities.map((activity) => (
                  <li key={activity.id} className="py-3">
                    <div className="flex items-start">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">{activity.user}</span> {activity.action}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.timestamp.toLocaleTimeString()} - {activity.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
