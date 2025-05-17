import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Clock, Calendar, Filter, TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';
import { generateTemperatureReadings, generateHumidityReadings } from '../data/fakeData';
import { TemperatureReading, HumidityReading } from '../types';
import useSensorData from '../hooks/useSensorData';
import { supabase } from '../utils/supabase';

// Define a type for the sensor data returned from the database
interface SensorDataRecord {
  id: number;
  temperature: number;
  humidity: number;
  location: string;
  created_at: string;
}

// Stats calculation interface
interface SensorStats {
  min: number;
  max: number;
  avg: number;
  current: number | null;
  trend: 'up' | 'down' | 'stable';
}

const TemperaturePage = () => {
  // Use the real sensor data hook for current values
  const { temperature, humidity, lastUpdated, tempUpdated, humUpdated } = useSensorData();
  
  // Historical data state
  const [temperatureReadings, setTemperatureReadings] = useState<TemperatureReading[]>([]);
  const [humidityReadings, setHumidityReadings] = useState<HumidityReading[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tempStats, setTempStats] = useState<SensorStats>({ min: 0, max: 0, avg: 0, current: null, trend: 'stable' });
  const [humidityStats, setHumidityStats] = useState<SensorStats>({ min: 0, max: 0, avg: 0, current: null, trend: 'stable' });
  
  // Format date
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Format date for chart labels
  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit'
    });
  };

  // Format date for tooltips
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter readings by time range
  const getFilteredByTime = (readings: TemperatureReading[] | HumidityReading[]) => {
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '12h' ? 12 : 6;
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    return readings.filter(reading => reading.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };
  
  // Filter readings by location and time
  const filteredTemperatureReadings = selectedLocation === 'All'
    ? temperatureReadings
    : temperatureReadings.filter(reading => reading.location === selectedLocation);
  
  const filteredHumidityReadings = selectedLocation === 'All'
    ? humidityReadings
    : humidityReadings.filter(reading => reading.location === selectedLocation);
  
  const timeFilteredTemperature = getFilteredByTime(filteredTemperatureReadings);
  const timeFilteredHumidity = getFilteredByTime(filteredHumidityReadings);

  // Fetch all history data when component mounts
  useEffect(() => {
    fetchAllSensorHistory();
  }, []);

  // Filter data when time range or location changes
  useEffect(() => {
    if (temperatureReadings.length > 0 || humidityReadings.length > 0) {
      applyFilters();
    }
  }, [timeRange, selectedLocation]);

  // Calculate stats when readings change
  useEffect(() => {
    if (temperatureReadings.length > 0) {
      const values = timeFilteredTemperature.map(r => r.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Determine trend (last 3 readings)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (values.length >= 3) {
        const recent = values.slice(-3);
        if (recent[2] > recent[0]) {
          trend = 'up';
        } else if (recent[2] < recent[0]) {
          trend = 'down';
        }
      }
      
      setTempStats({
        min: parseFloat(min.toFixed(1)),
        max: parseFloat(max.toFixed(1)),
        avg: parseFloat(avg.toFixed(1)),
        current: temperature,
        trend
      });
    }
    
    if (humidityReadings.length > 0) {
      const values = timeFilteredHumidity.map(r => r.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Determine trend (last 3 readings)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (values.length >= 3) {
        const recent = values.slice(-3);
        if (recent[2] > recent[0]) {
          trend = 'up';
        } else if (recent[2] < recent[0]) {
          trend = 'down';
        }
      }
      
      setHumidityStats({
        min: parseFloat(min.toFixed(1)),
        max: parseFloat(max.toFixed(1)),
        avg: parseFloat(avg.toFixed(1)),
        current: humidity,
        trend
      });
    }
  }, [temperatureReadings, humidityReadings, temperature, humidity, timeFilteredTemperature, timeFilteredHumidity]);

  // Fetch all sensor history data directly from the sensor_data table
  const fetchAllSensorHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Direct query to sensor_data table
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching sensor data history:', error);
        setError('Failed to load sensor history. Please try again later.');
        // Use fake data if real data fails
        setTemperatureReadings(generateTemperatureReadings(24));
        setHumidityReadings(generateHumidityReadings(24));
        return;
      }
      
      if (data && data.length > 0) {
        // Process the data
        processAndSetSensorData(data);
        
        // Extract unique locations
        const uniqueLocations = Array.from(
          new Set(data.map((item: SensorDataRecord) => item.location || 'Main Room'))
        );
        setLocations(uniqueLocations);
      } else {
        console.log('No sensor history data available, using generated data');
        // Use fake data if no real data
        setTemperatureReadings(generateTemperatureReadings(24));
        setHumidityReadings(generateHumidityReadings(24));
      }
    } catch (err: unknown) {
      console.error('Unexpected error fetching sensor history:', err);
      setError('An unexpected error occurred. Please try again later.');
      // Use fake data as fallback
      setTemperatureReadings(generateTemperatureReadings(24));
      setHumidityReadings(generateHumidityReadings(24));
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to the existing data
  const applyFilters = async () => {
    try {
      setIsLoading(true);
      
      // Get time filter
      const hours = timeRange === '24h' ? 24 : timeRange === '12h' ? 12 : 6;
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      // Direct query to sensor_data table with filters
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching filtered sensor data:', error);
        return;
      }
      
      if (data) {
        // Filter by location if needed
        let filteredData = data;
        if (selectedLocation !== 'All') {
          filteredData = data.filter((item: SensorDataRecord) => 
            item.location === selectedLocation
          );
        }
        
        // Process the filtered data
        processAndSetSensorData(filteredData);
      }
    } catch (err: unknown) {
      console.error('Error applying filters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to process and set sensor data
  const processAndSetSensorData = (data: SensorDataRecord[]) => {
    // Convert the data to our reading formats
    const tempReadings: TemperatureReading[] = data.map(item => ({
      id: item.id.toString(), // Convert number to string for the id
      value: item.temperature, // Should already be a number
      timestamp: new Date(item.created_at),
      location: item.location || 'Main Room'
    }));
    
    const humReadings: HumidityReading[] = data.map(item => ({
      id: item.id.toString(), // Convert number to string for the id
      value: item.humidity, // Should already be a number
      timestamp: new Date(item.created_at),
      location: item.location || 'Main Room'
    }));
    
    setTemperatureReadings(tempReadings);
    setHumidityReadings(humReadings);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAllSensorHistory();
  };

  // Helper to render trend icon
  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-blue-500" />;
    }
    return null;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Temperature & Humidity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor environmental conditions in real-time and view historical data
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Current Readings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-6 border border-orange-100 transition-all ${tempUpdated ? 'animate-pulse' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <Thermometer className="h-6 w-6 text-orange-700 mr-2" />
                <h3 className="text-lg font-medium text-orange-700">Current Temperature</h3>
              </div>
              <p className="text-4xl font-bold text-orange-800 mt-4">
                {temperature !== null ? `${temperature}°C` : 'Loading...'}
              </p>
              <p className="text-sm text-orange-600 mt-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {lastUpdated ? `Last updated: ${lastUpdated}` : 'Updating...'}
              </p>
              
              {/* Stats for temperature */}
              {tempStats.current !== null && (
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs bg-white bg-opacity-50 rounded-md p-2">
                  <div className="text-center">
                    <span className="block text-orange-500 font-medium">Min</span>
                    <span className="font-bold">{tempStats.min}°C</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-orange-500 font-medium">Avg</span>
                    <span className="font-bold">{tempStats.avg}°C</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-orange-500 font-medium">Max</span>
                    <span className="font-bold">{tempStats.max}°C</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-full bg-opacity-60 mb-2">
                <Thermometer className="h-12 w-12 text-orange-600" />
              </div>
              {renderTrendIcon(tempStats.trend)}
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-6 border border-blue-100 transition-all ${humUpdated ? 'animate-pulse' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <Droplets className="h-6 w-6 text-blue-700 mr-2" />
                <h3 className="text-lg font-medium text-blue-700">Current Humidity</h3>
              </div>
              <p className="text-4xl font-bold text-blue-800 mt-4">
                {humidity !== null ? `${humidity}%` : 'Loading...'}
              </p>
              <p className="text-sm text-blue-600 mt-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {lastUpdated ? `Last updated: ${lastUpdated}` : 'Updating...'}
              </p>
              
              {/* Stats for humidity */}
              {humidityStats.current !== null && (
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs bg-white bg-opacity-50 rounded-md p-2">
                  <div className="text-center">
                    <span className="block text-blue-500 font-medium">Min</span>
                    <span className="font-bold">{humidityStats.min}%</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-blue-500 font-medium">Avg</span>
                    <span className="font-bold">{humidityStats.avg}%</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-blue-500 font-medium">Max</span>
                    <span className="font-bold">{humidityStats.max}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-full bg-opacity-60 mb-2">
                <Droplets className="h-12 w-12 text-blue-600" />
              </div>
              {renderTrendIcon(humidityStats.trend)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="All">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="6h">Last 6 Hours</option>
                <option value="12h">Last 12 Hours</option>
                <option value="24h">Last 24 Hours</option>
              </select>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Filter className="h-4 w-4 mr-2" />
            <span>{timeFilteredTemperature.length} records found</span>
          </div>
        </div>
      </div>

      {/* Show error message if any */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* History Charts */}
      <div className="grid grid-cols-1 gap-8">
        {/* Temperature Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Temperature History</h3>
            {selectedLocation !== 'All' && (
              <span className="text-sm px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                {selectedLocation}
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-orange-500"></div>
            </div>
          ) : timeFilteredTemperature.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-gray-500">
              No temperature data available
            </div>
          ) : (
            <div className="h-72 w-full">
              {/* Enhanced visualization */}
              <div className="relative h-full flex items-end">
                {/* Temperature grid lines and labels */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">30°C</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">25°C</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">20°C</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">15°C</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">10°C</div>
                </div>
                
                {/* Data visualization container */}
                <div className="relative flex items-end justify-between w-full h-full pt-5 z-10">
                  {/* Line chart overlay for trend visualization */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                    <defs>
                      <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(249, 115, 22, 0.8)" />
                        <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                      </linearGradient>
                    </defs>
                    
                    {/* Area chart */}
                    {timeFilteredTemperature.length > 1 && (
                      <>
                        <path
                          d={`
                            M${timeFilteredTemperature.map((_, i) => 
                              `${(i / (timeFilteredTemperature.length - 1)) * 100}%`
                            ).join(',0 L')}
                            L100%,100% L0%,100% Z
                          `}
                          fill="url(#tempGradient)"
                          opacity="0.2"
                        />
                        
                        {/* Line chart */}
                        <path
                          d={`M${timeFilteredTemperature.map((reading, i) => {
                            const heightPercentage = Math.min(Math.max(((reading.value - 10) / (30 - 10)) * 100, 0), 100);
                            const x = (i / (timeFilteredTemperature.length - 1)) * 100;
                            const y = 100 - heightPercentage;
                            return `${x}%,${y}%`;
                          }).join(' L')}`}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Data points */}
                        {timeFilteredTemperature.map((reading, i) => {
                          const heightPercentage = Math.min(Math.max(((reading.value - 10) / (30 - 10)) * 100, 0), 100);
                          const x = (i / (timeFilteredTemperature.length - 1)) * 100;
                          const y = 100 - heightPercentage;
                          return (
                            <circle
                              key={`point-${i}`}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="3"
                              fill="white"
                              stroke="#f97316"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                  
                  {/* Bar chart */}
                  {timeFilteredTemperature.map((reading, index) => {
                    const heightPercentage = Math.min(Math.max(((reading.value - 10) / (30 - 10)) * 100, 0), 100);
                    return (
                      <div key={index} className="flex flex-col items-center group relative">
                        {/* Temperature bar with gradient */}
                        <div className="relative w-6 rounded-t-sm overflow-hidden">
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-orange-500 to-orange-300 hover:from-orange-600 hover:to-orange-400 transition-all duration-300"
                            style={{ height: `${heightPercentage}%` }}
                          ></div>
                        </div>
                        
                        {/* Time label */}
                        <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {formatTimeShort(reading.timestamp)}
                        </span>
                        
                        {/* Enhanced tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full mb-2 p-3 bg-white text-gray-800 text-xs rounded shadow-lg pointer-events-none border border-gray-200 z-20 w-36">
                          <div className="font-bold text-orange-600 text-sm mb-1 flex justify-between items-center">
                            <span>{reading.value.toFixed(1)}°C</span>
                            {index > 0 && (
                              <span className={`text-xs ${reading.value > timeFilteredTemperature[index-1].value ? 'text-red-500' : 'text-blue-500'}`}>
                                {reading.value > timeFilteredTemperature[index-1].value ? '▲' : '▼'} 
                                {Math.abs(reading.value - timeFilteredTemperature[index-1].value).toFixed(1)}°
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 mb-1">{formatDateTime(reading.timestamp)}</div>
                          <div className="flex items-center text-gray-700">
                            <div className="h-2 w-2 rounded-full bg-orange-500 mr-1"></div>
                            <span>{reading.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Chart legend and info */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <div>
              {tempStats.trend === 'up' && <span className="text-red-500 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Increasing trend</span>}
              {tempStats.trend === 'down' && <span className="text-blue-500 flex items-center"><TrendingDown className="h-3 w-3 mr-1" /> Decreasing trend</span>}
              {tempStats.trend === 'stable' && <span>Stable temperature</span>}
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-3 w-3 mr-1" />
              <span>Range: {tempStats.min}°C - {tempStats.max}°C</span>
            </div>
          </div>
        </div>

        {/* Humidity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Humidity History</h3>
            {selectedLocation !== 'All' && (
              <span className="text-sm px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                {selectedLocation}
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-blue-500"></div>
            </div>
          ) : timeFilteredHumidity.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-gray-500">
              No humidity data available
            </div>
          ) : (
            <div className="h-72 w-full">
              {/* Enhanced visualization */}
              <div className="relative h-full flex items-end">
                {/* Humidity grid lines and labels */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">90%</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">70%</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">50%</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">30%</div>
                  <div className="border-b border-gray-100 text-xs text-gray-400 pl-2">10%</div>
                </div>
                
                {/* Data visualization container */}
                <div className="relative flex items-end justify-between w-full h-full pt-5 z-10">
                  {/* Line chart overlay for trend visualization */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                    <defs>
                      <linearGradient id="humidityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                      </linearGradient>
                    </defs>
                    
                    {/* Area chart */}
                    {timeFilteredHumidity.length > 1 && (
                      <>
                        <path
                          d={`
                            M${timeFilteredHumidity.map((_, i) => 
                              `${(i / (timeFilteredHumidity.length - 1)) * 100}%`
                            ).join(',0 L')}
                            L100%,100% L0%,100% Z
                          `}
                          fill="url(#humidityGradient)"
                          opacity="0.2"
                        />
                        
                        {/* Line chart */}
                        <path
                          d={`M${timeFilteredHumidity.map((reading, i) => {
                            const heightPercentage = Math.min(Math.max(((reading.value - 10) / (90 - 10)) * 100, 0), 100);
                            const x = (i / (timeFilteredHumidity.length - 1)) * 100;
                            const y = 100 - heightPercentage;
                            return `${x}%,${y}%`;
                          }).join(' L')}`}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Data points */}
                        {timeFilteredHumidity.map((reading, i) => {
                          const heightPercentage = Math.min(Math.max(((reading.value - 10) / (90 - 10)) * 100, 0), 100);
                          const x = (i / (timeFilteredHumidity.length - 1)) * 100;
                          const y = 100 - heightPercentage;
                          return (
                            <circle
                              key={`point-${i}`}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="3"
                              fill="white"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                  
                  {/* Bar chart */}
                  {timeFilteredHumidity.map((reading, index) => {
                    const heightPercentage = Math.min(Math.max(((reading.value - 10) / (90 - 10)) * 100, 0), 100);
                    return (
                      <div key={index} className="flex flex-col items-center group relative">
                        {/* Humidity bar with gradient */}
                        <div className="relative w-6 rounded-t-sm overflow-hidden">
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400 transition-all duration-300"
                            style={{ height: `${heightPercentage}%` }}
                          ></div>
                        </div>
                        
                        {/* Time label */}
                        <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {formatTimeShort(reading.timestamp)}
                        </span>
                        
                        {/* Enhanced tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full mb-2 p-3 bg-white text-gray-800 text-xs rounded shadow-lg pointer-events-none border border-gray-200 z-20 w-36">
                          <div className="font-bold text-blue-600 text-sm mb-1 flex justify-between items-center">
                            <span>{reading.value.toFixed(1)}%</span>
                            {index > 0 && (
                              <span className={`text-xs ${reading.value > timeFilteredHumidity[index-1].value ? 'text-red-500' : 'text-blue-500'}`}>
                                {reading.value > timeFilteredHumidity[index-1].value ? '▲' : '▼'} 
                                {Math.abs(reading.value - timeFilteredHumidity[index-1].value).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 mb-1">{formatDateTime(reading.timestamp)}</div>
                          <div className="flex items-center text-gray-700">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                            <span>{reading.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Chart legend and info */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <div>
              {humidityStats.trend === 'up' && <span className="text-red-500 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Increasing trend</span>}
              {humidityStats.trend === 'down' && <span className="text-blue-500 flex items-center"><TrendingDown className="h-3 w-3 mr-1" /> Decreasing trend</span>}
              {humidityStats.trend === 'stable' && <span>Stable humidity</span>}
            </div>
            <div className="flex items-center">
              <Maximize2 className="h-3 w-3 mr-1" />
              <span>Range: {humidityStats.min}% - {humidityStats.max}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemperaturePage;