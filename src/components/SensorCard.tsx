import React from 'react';
import { Thermometer, Droplets } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number | null;
  unit: string;
  type: 'temperature' | 'humidity';
  isUpdated: boolean;
}

/**
 * SensorCard component for displaying sensor readings with animation
 */
const SensorCard: React.FC<SensorCardProps> = ({ 
  title, 
  value, 
  unit, 
  type, 
  isUpdated 
}) => {
  // Determine icon and color based on type
  const icon = type === 'temperature' ? (
    <Thermometer className="h-6 w-6" />
  ) : (
    <Droplets className="h-6 w-6" />
  );
  
  const colorClass = type === 'temperature'
    ? 'bg-orange-50 text-orange-700' 
    : 'bg-blue-50 text-blue-700';
  
  // Add pulse animation when data is updated
  const animationClass = isUpdated ? 'animate-pulse' : '';
  
  return (
    <div className={`${colorClass} ${animationClass} rounded-lg shadow-sm p-4 transition-transform duration-200 hover:shadow-md hover:scale-105`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {value !== null ? `${value}${unit}` : 'Loading...'}
          </p>
        </div>
        <div className="p-2 rounded-full bg-white bg-opacity-30">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default SensorCard; 