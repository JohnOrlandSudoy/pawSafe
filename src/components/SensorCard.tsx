import React from 'react';
import { Thermometer, Droplets, TrendingUp, TrendingDown, WifiOff } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number | null;
  unit: string;
  type: 'temperature' | 'humidity';
  isUpdated?: boolean;
  isOffline?: boolean;
}

/**
 * SensorCard component for displaying sensor readings with animation
 */
const SensorCard: React.FC<SensorCardProps> = ({ 
  title, 
  value, 
  unit, 
  type, 
  isUpdated = false,
  isOffline = false
}) => {
  // Determine icon based on type
  const icon = type === 'temperature' 
    ? <Thermometer className="h-6 w-6 text-orange-700" /> 
    : <Droplets className="h-6 w-6 text-blue-700" />;
  
  // Determine background color based on type
  const bgColor = type === 'temperature' 
    ? 'from-orange-50 to-orange-100 border-orange-100' 
    : 'from-blue-50 to-blue-100 border-blue-100';
  
  // Determine text color based on type
  const textColor = type === 'temperature' ? 'text-orange-700' : 'text-blue-700';
  const valueColor = type === 'temperature' ? 'text-orange-800' : 'text-blue-800';
  
  // Determine status color based on value
  const getStatusColor = () => {
    if (isOffline) return 'text-gray-500';
    
    if (type === 'temperature') {
      if (value === null) return 'text-gray-500';
      if (value > 30) return 'text-red-600';
      if (value < 15) return 'text-blue-600';
      return 'text-green-600';
    } else {
      if (value === null) return 'text-gray-500';
      if (value > 70) return 'text-red-600';
      if (value < 30) return 'text-yellow-600';
      return 'text-green-600';
    }
  };
  
  // Determine status message
  const getStatusMessage = () => {
    if (isOffline) return 'Sensor offline';
    
    if (type === 'temperature') {
      if (value === null) return 'No data';
      if (value > 30) return 'Too hot';
      if (value < 15) return 'Too cold';
      return 'Normal';
    } else {
      if (value === null) return 'No data';
      if (value > 70) return 'Too humid';
      if (value < 30) return 'Too dry';
      return 'Normal';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-lg shadow-sm p-6 border transition-all ${isUpdated ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {icon}
          <h3 className={`text-lg font-medium ${textColor} ml-2`}>{title}</h3>
        </div>
        
        {isOffline && (
          <div className="flex items-center text-yellow-600">
            <WifiOff className="h-4 w-4 mr-1" />
            <span className="text-xs">Offline</span>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <p className={`text-4xl font-bold ${valueColor}`}>
          {isOffline ? '—' : value !== null ? `${value}${unit}` : 'Loading...'}
        </p>
        
        <div className="flex items-center mt-2">
          <span className={`text-sm ${getStatusColor()} flex items-center`}>
            {getStatusMessage()}
            {isUpdated && <TrendingUp className="h-4 w-4 ml-1" />}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SensorCard; 
