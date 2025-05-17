import { useState, useEffect } from 'react';
import { supabase, fetchLatestSensorData } from '../utils/supabase';

/**
 * Custom hook for fetching and subscribing to sensor data
 * @returns {Object} The sensor data state and update states
 */
const useSensorData = () => {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tempUpdated, setTempUpdated] = useState(false);
  const [humUpdated, setHumUpdated] = useState(false);

  useEffect(() => {
    // Fetch initial data
    const loadInitialData = async () => {
      const data = await fetchLatestSensorData();
      if (data) {
        setTemperature(data.temperature);
        setHumidity(data.humidity);
        setLastUpdated(new Date(data.created_at).toLocaleString());
      }
    };

    loadInitialData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('sensor_data_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => {
          console.log('New data:', payload);
          setTemperature(payload.new.temperature);
          setHumidity(payload.new.humidity);
          setLastUpdated(new Date(payload.new.created_at).toLocaleString());
          
          // Trigger animations
          setTempUpdated(true);
          setHumUpdated(true);
          
          // Reset animation triggers after animation completes
          setTimeout(() => {
            setTempUpdated(false);
            setHumUpdated(false);
          }, 600);
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    temperature,
    humidity,
    lastUpdated,
    tempUpdated,
    humUpdated
  };
};

export default useSensorData; 