import { User, Pet, PetType, Gender, Alert, Activity, TemperatureReading, HumidityReading } from '../types';

// Helper function to generate random ID
export const generateId = () => Math.random().toString(36).substring(2, 10);

// Helper function to generate random date within the last n days
export const randomDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
};

// Generate fake users
export const generateFakeUsers = (count: number): User[] => {
  const roles = ['Administrator', 'Veterinarian', 'Caretaker', 'Staff'];
  const users: User[] = [];
  
  for (let i = 0; i < count; i++) {
    users.push({
      id: (i + 2).toString(), // Start from 2 as 1 is admin
      username: `user${i + 1}`,
      password: `password${i + 1}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      avatar: `https://images.pexels.com/photos/${1000000 + i * 1111}/pexels-photo-${1000000 + i * 1111}.jpeg?auto=compress&cs=tinysrgb&w=300`,
    });
  }
  
  return users;
};

// Generate fake pets
export const generateFakePets = (count: number): Pet[] => {
  const dogs = ['Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 'Beagle', 'Husky'];
  const cats = ['Persian', 'Maine Coon', 'Siamese', 'Bengal', 'Ragdoll', 'Scottish Fold'];
  const pets: Pet[] = [];
  
  for (let i = 0; i < count; i++) {
    const type: PetType = Math.random() > 0.5 ? 'Dog' : 'Cat';
    const gender: Gender = Math.random() > 0.5 ? 'Male' : 'Female';
    const isPregnant = gender === 'Female' && Math.random() > 0.7;
    
    pets.push({
      id: (i + 1).toString(),
      name: type === 'Dog' ? `Buddy${i + 1}` : `Whiskers${i + 1}`,
      type,
      breed: type === 'Dog' 
        ? dogs[Math.floor(Math.random() * dogs.length)]
        : cats[Math.floor(Math.random() * cats.length)],
      gender,
      isPregnant,
      owner: `Owner ${i + 1}`,
      image: type === 'Dog' 
        ? `https://images.pexels.com/photos/${1200000 + i * 1111}/pexels-photo-${1200000 + i * 1111}.jpeg?auto=compress&cs=tinysrgb&w=300`
        : `https://images.pexels.com/photos/${1300000 + i * 1111}/pexels-photo-${1300000 + i * 1111}.jpeg?auto=compress&cs=tinysrgb&w=300`,
    });
  }
  
  return pets;
};

// Generate fake alerts
export const generateFakeAlerts = (count: number): Alert[] => {
  const alertTypes: ('info' | 'warning' | 'error')[] = ['info', 'warning', 'error'];
  const alertMessages = [
    'Temperature too high in kennel area',
    'Humidity levels below recommended',
    'New pet registration required',
    'Feeding time alert',
    'Medical checkup scheduled',
    'Pregnant pet needs attention',
  ];
  
  const alerts: Alert[] = [];
  
  for (let i = 0; i < count; i++) {
    alerts.push({
      id: (i + 1).toString(),
      message: alertMessages[Math.floor(Math.random() * alertMessages.length)],
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      timestamp: randomDate(7),
    });
  }
  
  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate fake activities
export const generateFakeActivities = (count: number): Activity[] => {
  const actions = [
    'logged in',
    'added new pet',
    'updated pet information',
    'checked temperature readings',
    'responded to alert',
    'updated settings',
  ];
  
  const users = ['admin', 'user1', 'user2', 'user3', 'user4'];
  const activities: Activity[] = [];
  
  for (let i = 0; i < count; i++) {
    activities.push({
      id: (i + 1).toString(),
      action: actions[Math.floor(Math.random() * actions.length)],
      user: users[Math.floor(Math.random() * users.length)],
      timestamp: randomDate(3),
      details: Math.random() > 0.5 ? `Details for activity ${i + 1}` : undefined,
    });
  }
  
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate temperature readings
export const generateTemperatureReadings = (count: number): TemperatureReading[] => {
  const locations = ['Kennel A', 'Kennel B', 'Cattery', 'Isolation Room', 'Maternity Area'];
  const readings: TemperatureReading[] = [];
  
  // Generate readings for the past 24 hours
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - i);
    
    readings.push({
      id: (i + 1).toString(),
      value: 20 + Math.random() * 5, // Temperature between 20-25°C
      timestamp,
      location: locations[Math.floor(Math.random() * locations.length)],
    });
  }
  
  return readings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate humidity readings
export const generateHumidityReadings = (count: number): HumidityReading[] => {
  const locations = ['Kennel A', 'Kennel B', 'Cattery', 'Isolation Room', 'Maternity Area'];
  const readings: HumidityReading[] = [];
  
  // Generate readings for the past 24 hours
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - i);
    
    readings.push({
      id: (i + 1).toString(),
      value: 40 + Math.random() * 20, // Humidity between 40-60%
      timestamp,
      location: locations[Math.floor(Math.random() * locations.length)],
    });
  }
  
  return readings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate current stats for dashboard
export const generateCurrentStats = () => {
  const pets = generateFakePets(12);
  const dogCount = pets.filter(pet => pet.type === 'Dog').length;
  const catCount = pets.filter(pet => pet.type === 'Cat').length;
  const pregnantCount = pets.filter(pet => pet.isPregnant).length;
  
  const currentTemp = 22.5 + (Math.random() * 2 - 1);
  const currentHumidity = 50 + (Math.random() * 10 - 5);
  
  return {
    dogCount,
    catCount,
    pregnantCount,
    temperature: currentTemp.toFixed(1),
    temperatureTrend: { value: 0.3, isPositive: true },
    humidity: currentHumidity.toFixed(1),
    humidityTrend: { value: 0.8, isPositive: false },
  };
};

// Initialize fake data
export const fakeData = {
  users: generateFakeUsers(8),
  pets: generateFakePets(12),
  alerts: generateFakeAlerts(10),
  activities: generateFakeActivities(15),
  temperatureReadings: generateTemperatureReadings(24),
  humidityReadings: generateHumidityReadings(24),
  currentStats: generateCurrentStats(),
};