import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowLeft, Thermometer, Droplets, AlertCircle } from 'lucide-react';
import { Pet } from '../types';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Route } from '../types';
import PetMonitorCard from '../components/PetMonitorCard';
import useSensorData from '../hooks/useSensorData';

const PetMonitorPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Dog' | 'Cat'>('All');
  const [monitoringPetId, setMonitoringPetId] = useState<string | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<{
    petName: string;
    breed: string;
    type: string;
    isPregnant: boolean;
    lastUpdated: string;
  } | null>(null);
  const { setCurrentRoute } = useAuth();
  
  // Get current sensor data
  const { temperature, humidity, lastUpdated } = useSensorData();
  
  // Fetch pets and current monitoring status
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        
        // Fetch all pets
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .order('name', { ascending: true });
          
        if (petsError) throw petsError;
        
        // Fetch current monitoring settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('esp_settings')
          .select('*')
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" - not an error for us
          console.error('Error fetching ESP settings:', settingsError);
        }
        
        // Map the database field is_pregnant to isPregnant in our Pet objects
        const formattedPets = petsData?.map(pet => ({
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          gender: pet.gender,
          isPregnant: pet.is_pregnant, // Map directly from database field
          owner: pet.owner_id,
          image: pet.image_url,
          created_at: pet.created_at,
          updated_at: pet.updated_at
        })) || [];
        
        // Log to debug
        console.log('Fetched pets with pregnancy status:', formattedPets.map(p => ({
          name: p.name, 
          gender: p.gender, 
          isPregnant: p.isPregnant,
          originalIsPregnant: petsData?.find(dp => dp.id === p.id)?.is_pregnant
        })));
        
        setPets(formattedPets);
        
        if (settingsData) {
          setMonitoringPetId(settingsData.current_pet_id);
          
          // Find the pet being monitored to show details
          const monitoredPet = formattedPets.find(p => p.id === settingsData.current_pet_id);
          if (monitoredPet) {
            setMonitoringStatus({
              petName: monitoredPet.name,
              breed: monitoredPet.breed,
              type: monitoredPet.type,
              isPregnant: monitoredPet.isPregnant,
              lastUpdated: new Date(settingsData.updated_at).toLocaleString()
            });
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPets();
    
    // Subscribe to ESP settings changes
    const subscription = supabase
      .channel('esp-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'esp_settings' },
        (payload) => {
          if (payload.new) {
            setMonitoringPetId(payload.new.current_pet_id);
            
            // Update monitoring status when settings change
            const monitoredPet = pets.find(p => p.id === payload.new.current_pet_id);
            if (monitoredPet) {
              setMonitoringStatus({
                petName: monitoredPet.name,
                breed: monitoredPet.breed,
                type: monitoredPet.type,
                isPregnant: monitoredPet.isPregnant,
                lastUpdated: new Date(payload.new.updated_at).toLocaleString()
              });
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
  
  // Handle starting monitoring for a pet
  const handleMonitorStart = async (petId: string) => {
    try {
      // Find the selected pet
      const selectedPet = pets.find(p => p.id === petId);
      if (!selectedPet) return;
      
      // Get thresholds based on pet type and breed
      const thresholds = getThresholds(selectedPet);
      
      // Update ESP settings
      const { error } = await supabase
        .from('esp_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001', // Use a fixed UUID for the single settings row
          current_pet_id: petId,
          current_breed: selectedPet.breed,
          is_cat: selectedPet.type === 'Cat',
          is_pregnant: selectedPet.isPregnant,
          medium_fan_temp: thresholds.mediumFanTemp,
          high_fan_temp: thresholds.highFanTemp,
          heater_temp: thresholds.heaterTemp,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Update local state
      setMonitoringPetId(petId);
      setMonitoringStatus({
        petName: selectedPet.name,
        breed: selectedPet.breed,
        type: selectedPet.type,
        isPregnant: selectedPet.isPregnant,
        lastUpdated: new Date().toLocaleString()
      });
      
      // Log the action
      await supabase
        .from('activities')
        .insert({
          type: 'monitor_start',
          description: `Started monitoring ${selectedPet.name} (${selectedPet.breed})`,
          pet_id: petId
        });
        
    } catch (err) {
      console.error('Error starting monitoring:', err);
    }
  };
  
  // Helper function to get thresholds based on pet type and breed
  const getThresholds = (pet: Pet) => {
    // Default thresholds
    let thresholds = {
      mediumFanTemp: 30,
      highFanTemp: 35,
      heaterTemp: 27
    };
    
    const breed = pet.breed.toLowerCase();
    
    if (pet.type === 'Dog') {
      // Dog breeds (Short to Medium)
      const shortToMediumBreeds = ['aspin', 'corgi', 'chihuahua', 'dachshund', 'pomeranian', 'poodle', 'beagle', 'yorkshire terrier'];
      if (shortToMediumBreeds.includes(breed)) {
        thresholds = {
          mediumFanTemp: 30,
          highFanTemp: 35,
          heaterTemp: 27
        };
      }
      
      // Flat-faced dogs
      const flatFacedDogs = ['french bulldog', 'english bulldog', 'american bulldog', 'shih tzu', 'pug'];
      if (flatFacedDogs.includes(breed)) {
        thresholds = {
          mediumFanTemp: 29,
          highFanTemp: 33,
          heaterTemp: 27
        };
      }
      
      // If pregnant, adjust thresholds
      if (pet.isPregnant) {
        // Lower temperature thresholds for pregnant dogs
        thresholds.mediumFanTemp -= 1;
        thresholds.highFanTemp -= 2;
        thresholds.heaterTemp += 1;
      }
    } else if (pet.type === 'Cat') {
      // Cat breeds (Group 1 - Short to Medium)
      const shortToMediumCats = ['puspin', 'bengal', 'siamese', 'american shorthair', 'russian blue', 'american curl'];
      if (shortToMediumCats.includes(breed)) {
        thresholds = {
          mediumFanTemp: 34,
          highFanTemp: 38,
          heaterTemp: 22
        };
      }
      
      // Cat breeds (Short and Flat-faced)
      const flatFacedCats = ['british shorthair', 'exotic shorthair', 'himalayan', 'persian'];
      if (flatFacedCats.includes(breed)) {
        thresholds = {
          mediumFanTemp: 34,
          highFanTemp: 34, // Only high fan setting
          heaterTemp: 22
        };
      }
      
      // If pregnant, adjust thresholds
      if (pet.isPregnant) {
        // Lower temperature thresholds for pregnant cats
        thresholds.mediumFanTemp -= 2;
        thresholds.highFanTemp -= 3;
        thresholds.heaterTemp += 2;
      }
    }
    
    return thresholds;
  };
  
  // Filter pets based on search and type
  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pet.breed.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'All' || pet.type === filterType;
    
    return matchesSearch && matchesType;
  });
  
  // Navigate back to dashboard
  const navigateToDashboard = () => {
    setCurrentRoute(Route.DASHBOARD);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button 
          onClick={navigateToDashboard}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex flex-col lg:flex-row justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Pet Monitoring</h2>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and control environmental conditions for specific pets
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search pets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'All' | 'Dog' | 'Cat')}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
            >
              <option value="All">All Types</option>
              <option value="Dog">Dogs</option>
              <option value="Cat">Cats</option>
            </select>
            <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>
      
      {/* Current monitoring status */}
      {monitoringStatus && (
        <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="text-sm font-medium text-green-800 mb-2">Currently Monitoring</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <span className="font-medium text-green-700">{monitoringStatus.petName}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-gray-700">{monitoringStatus.breed}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-gray-700">{monitoringStatus.type}</span>
            </div>
            {monitoringStatus.isPregnant && (
              <div className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                Pregnant
              </div>
            )}
            <div className="text-xs text-gray-500">
              Started: {monitoringStatus.lastUpdated}
            </div>
          </div>
        </div>
      )}
      
      {/* Current sensor readings */}
      {(temperature !== null || humidity !== null) && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Current Sensor Readings</h3>
          <div className="flex flex-wrap gap-4">
            {temperature !== null && (
              <div className="flex items-center">
                <Thermometer className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-gray-800">{temperature}°C</span>
              </div>
            )}
            {humidity !== null && (
              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-gray-800">{humidity}%</span>
              </div>
            )}
            {lastUpdated && (
              <div className="text-xs text-gray-500">
                Last updated: {lastUpdated}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Pet monitoring cards */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading pets...</p>
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No pets found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map(pet => (
            <PetMonitorCard
              key={pet.id}
              pet={pet}
              onMonitorStart={handleMonitorStart}
              isMonitoring={pet.id === monitoringPetId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PetMonitorPage;



