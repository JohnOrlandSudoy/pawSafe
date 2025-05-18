import React, { useState } from 'react';
import { Thermometer, Fan, Flame, Dog, Cat, AlertCircle } from 'lucide-react';
import { Pet } from '../types';
import { supabase } from '../utils/supabase';

interface PetMonitorCardProps {
  pet: Pet;
  onMonitorStart: (petId: string) => void;
  isMonitoring: boolean;
}

// Define threshold types based on your data
interface ThresholdData {
  mediumFanTemp: number;
  highFanTemp: number;
  heaterTemp: number;
}

const PetMonitorCard: React.FC<PetMonitorCardProps> = ({ pet, onMonitorStart, isMonitoring }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get thresholds based on pet type and breed
  const getThresholds = (): ThresholdData => {
    // Default thresholds
    let thresholds: ThresholdData = {
      mediumFanTemp: 30,
      highFanTemp: 35,
      heaterTemp: 0 // Default to 0 (disabled) for non-pregnant pets
    };
    
    const breed = pet.breed.toLowerCase();
    
    // Log to debug
    console.log(`Getting thresholds for ${pet.name}: type=${pet.type}, breed=${pet.breed}, isPregnant=${pet.isPregnant}`);
    
    if (pet.type === 'Dog') {
      // Dog breeds (Short to Medium)
      const shortToMediumBreeds = ['aspin', 'corgi', 'chihuahua', 'dachshund', 'pomeranian', 'poodle', 'beagle', 'yorkshire terrier'];
      if (shortToMediumBreeds.includes(breed)) {
        thresholds = {
          mediumFanTemp: pet.isPregnant ? 0 : 30, // Disable fan if pregnant
          highFanTemp: pet.isPregnant ? 0 : 35,   // Disable fan if pregnant
          heaterTemp: pet.isPregnant ? 27 : 0     // Enable heater only if pregnant
        };
      }
      
      // Flat-faced dogs
      const flatFacedDogs = ['french bulldog', 'english bulldog', 'american bulldog', 'shih tzu', 'pug'];
      if (flatFacedDogs.includes(breed)) {
        thresholds = {
          mediumFanTemp: pet.isPregnant ? 0 : 29, // Disable fan if pregnant
          highFanTemp: pet.isPregnant ? 0 : 33,   // Disable fan if pregnant
          heaterTemp: pet.isPregnant ? 27 : 0     // Enable heater only if pregnant
        };
      }
    } else if (pet.type === 'Cat') {
      // Cat breeds (Group 1 - Short to Medium)
      const shortToMediumCats = ['puspin', 'bengal', 'siamese', 'american shorthair', 'russian blue', 'american curl'];
      if (shortToMediumCats.includes(breed)) {
        thresholds = {
          mediumFanTemp: pet.isPregnant ? 0 : 34, // Disable fan if pregnant
          highFanTemp: pet.isPregnant ? 0 : 38,   // Disable fan if pregnant
          heaterTemp: pet.isPregnant ? 22 : 0     // Enable heater only if pregnant
        };
      }
      
      // Cat breeds (Short and Flat-faced)
      const flatFacedCats = ['british shorthair', 'exotic shorthair', 'himalayan', 'persian'];
      if (flatFacedCats.includes(breed)) {
        thresholds = {
          mediumFanTemp: pet.isPregnant ? 0 : 34, // Disable fan if pregnant
          highFanTemp: pet.isPregnant ? 0 : 34,   // Disable fan if pregnant
          heaterTemp: pet.isPregnant ? 22 : 0     // Enable heater only if pregnant
        };
      }
    }
    
    console.log(`Final thresholds for ${pet.name}: mediumFan=${thresholds.mediumFanTemp}, highFan=${thresholds.highFanTemp}, heater=${thresholds.heaterTemp}`);
    return thresholds;
  };
  
  const thresholds = getThresholds();
  
  // Handle monitor button click
  const handleMonitorClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Starting monitoring for ${pet.name} with isPregnant=${pet.isPregnant}`);
      
      // Send thresholds to ESP8266 via Supabase
      const { error } = await supabase
        .from('esp_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001', // Use a fixed UUID for the single settings row
          current_pet_id: pet.id,
          current_breed: pet.breed,
          is_cat: pet.type === 'Cat',
          is_pregnant: pet.isPregnant, // Use the value directly
          medium_fan_temp: thresholds.mediumFanTemp,
          high_fan_temp: thresholds.highFanTemp,
          heater_temp: thresholds.heaterTemp,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Notify parent component
      onMonitorStart(pet.id);
      
      // Log the action
      await supabase
        .from('activities')
        .insert({
          type: 'monitor_start',
          description: `Started monitoring ${pet.name} (${pet.breed})`,
          pet_id: pet.id
        });
    } catch (err) {
      console.error('Error setting monitoring:', err);
      setError('Failed to start monitoring. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {pet.type === 'Dog' ? (
            <Dog className="h-5 w-5 text-green-600 mr-2" />
          ) : (
            <Cat className="h-5 w-5 text-purple-600 mr-2" />
          )}
          <h3 className="font-medium text-gray-800">{pet.name}</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
          {pet.breed}
        </span>
      </div>
      
      <div className="p-4">
        <div className={`grid ${pet.isPregnant ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
          {!pet.isPregnant && (
            <>
              <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center shadow-sm">
                <Fan className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs text-center text-gray-700">Medium Fan</span>
                <span className="font-medium text-blue-700">{thresholds.mediumFanTemp}°C+</span>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg flex flex-col items-center shadow-sm">
                <Fan className="h-5 w-5 text-red-600 mb-1" />
                <span className="text-xs text-center text-gray-700">High Fan</span>
                <span className="font-medium text-red-700">{thresholds.highFanTemp}°C+</span>
              </div>
            </>
          )}
          
          {pet.isPregnant && (
            <div className="bg-orange-50 p-3 rounded-lg flex flex-col items-center shadow-sm">
              <Flame className="h-5 w-5 text-orange-600 mb-1" />
              <span className="text-xs text-center text-gray-700">Heater</span>
              <span className="font-medium text-orange-700">{thresholds.heaterTemp}°C-</span>
            </div>
          )}
        </div>
        
        {pet.gender === 'Female' && (
          <div className="mb-3 bg-gray-50 text-gray-700 text-xs p-2 rounded-md flex items-center">
            <span className="mr-1">Pregnancy Status:</span> 
            {pet.isPregnant ? (
              <span className="text-pink-700 font-medium flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500 mr-1"></span>
                Pregnant
              </span>
            ) : (
              <span className="text-blue-700 font-medium">Not Pregnant</span>
            )}
          </div>
        )}

        {pet.isPregnant && (
          <div className="mb-3 bg-pink-50 text-pink-700 text-xs p-2 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Heater active for pregnant pet (fan disabled)
          </div>
        )}
        
        {!pet.isPregnant && (
          <div className="mb-3 bg-blue-50 text-blue-700 text-xs p-2 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Fan active for non-pregnant pet (heater disabled)
          </div>
        )}
        
        {error && (
          <div className="mb-3 bg-red-50 text-red-700 text-xs p-2 rounded-md">
            {error}
          </div>
        )}
        
        <button
          onClick={handleMonitorClick}
          disabled={loading || isMonitoring}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
            isMonitoring 
              ? 'bg-green-100 text-green-700 cursor-default' 
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {loading ? (
            <span>Processing...</span>
          ) : isMonitoring ? (
            <span>Currently Monitoring</span>
          ) : (
            <span>Start Monitoring</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default PetMonitorCard;


