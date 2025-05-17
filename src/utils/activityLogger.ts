import { supabase } from './supabase';
import { User } from '../types';

/**
 * Log an activity in the system
 * @param action The action description
 * @param user The user who performed the action
 * @param details Additional details about the action
 * @param entityType Optional entity type (e.g., 'pet', 'user')
 * @param entityId Optional entity ID
 * @returns Promise<void>
 */
export const logActivity = async (
  action: string,
  user: User | null,
  details?: string,
  entityType?: string,
  entityId?: string
): Promise<void> => {
  try {
    const activityData = {
      action,
      user_id: user?.id,
      user_name: user ? user.fullName || user.username : 'System',
      details,
      entity_type: entityType,
      entity_id: entityId
    };

    const { error } = await supabase.from('activities').insert(activityData);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

/**
 * Create a system alert
 * @param message The alert message
 * @param type The alert type ('info', 'warning', 'error')
 * @param source Optional source of the alert
 * @param entityType Optional entity type
 * @param entityId Optional entity ID
 * @returns Promise<void>
 */
export const createAlert = async (
  message: string,
  type: 'info' | 'warning' | 'error' = 'info',
  source?: string,
  entityType?: string,
  entityId?: string
): Promise<void> => {
  try {
    const alertData = {
      message,
      type,
      source,
      entity_type: entityType,
      entity_id: entityId
    };

    const { error } = await supabase.from('alerts').insert(alertData);

    if (error) {
      console.error('Failed to create alert:', error);
    }
  } catch (err) {
    console.error('Error creating alert:', err);
  }
}; 