import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Fetches the latest sensor data record
 * @returns {Promise<Object|null>} The latest sensor data or null if error
 */
export const fetchLatestSensorData = async () => {
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching sensor data:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error fetching sensor data:', err);
    return null;
  }
}; 