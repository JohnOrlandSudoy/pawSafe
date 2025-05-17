// Route types
export enum Route {
  AUTH = 'auth',
  DASHBOARD = 'dashboard',
  USERS = 'users',
  PETS = 'pets',
  TEMPERATURE = 'temperature',
  PROFILE = 'profile'
}

// User types
export interface User {
  id: string;
  username: string;
  fullName?: string;
  role: string;
  avatar?: string | null;
  metadata?: {
    specialty?: string;
    license?: string;
    contact?: string;
    notes?: string;
  };
}

// Pet types
export type PetType = 'Dog' | 'Cat';
export type Gender = 'Male' | 'Female';

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  breed: string;
  gender: Gender;
  isPregnant: boolean;
  owner?: string;
  image?: string;
}

// Dashboard types
export interface MetricCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  details?: string;
}

export interface Alert {
  id: string;
  message: string;
  type: string;
  timestamp: Date;
  resolved?: boolean;
}

export interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details?: string;
}

// Temperature data
export interface TemperatureReading {
  id: string;
  value: number;
  timestamp: Date;
  location: string;
}

// Humidity data
export interface HumidityReading {
  id: string;
  value: number;
  timestamp: Date;
  location: string;
}
