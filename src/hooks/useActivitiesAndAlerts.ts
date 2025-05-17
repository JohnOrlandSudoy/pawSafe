import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Alert, Activity } from '../types';

/**
 * Custom hook for fetching and subscribing to system activities and alerts
 */
const useActivitiesAndAlerts = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data and set up subscriptions
  useEffect(() => {
    // Fetch initial activities
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Map database entries to Activity type
        const formattedActivities: Activity[] = (data || []).map(item => ({
          id: item.id,
          action: item.action,
          user: item.user_name || 'System',
          timestamp: new Date(item.created_at),
          details: item.details
        }));
        
        setActivities(formattedActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
      }
    };

    // Fetch initial alerts
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Map database entries to Alert type
        const formattedAlerts: Alert[] = (data || []).map(item => ({
          id: item.id,
          message: item.message,
          type: item.type || 'info',
          timestamp: new Date(item.created_at),
        }));
        
        setAlerts(formattedAlerts);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    // Load initial data
    fetchActivities();
    fetchAlerts();

    // Subscribe to real-time updates for activities
    const activitiesSubscription = supabase
      .channel('activities-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          const newActivity: Activity = {
            id: payload.new.id,
            action: payload.new.action,
            user: payload.new.user_name || 'System',
            timestamp: new Date(payload.new.created_at),
            details: payload.new.details
          };
          
          // Add new activity to the beginning of the list
          setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();
      
    // Subscribe to real-time updates for alerts
    const alertsSubscription = supabase
      .channel('alerts-channel')
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
          setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    // Clean up subscriptions
    return () => {
      supabase.removeChannel(activitiesSubscription);
      supabase.removeChannel(alertsSubscription);
    };
  }, []);

  return { activities, alerts, loading, error };
};

export default useActivitiesAndAlerts; 