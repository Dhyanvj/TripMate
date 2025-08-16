/**
 * Application constants for TripMate
 */

// Trip types with their icons and gradient colors
export const TRIP_TYPES = {
  beach: {
    label: 'Beach',
    icon: 'ri-map-pin-line',
    gradient: 'from-primary-500 to-secondary-500',
  },
  camping: {
    label: 'Camping',
    icon: 'ri-mountain-line',
    gradient: 'from-secondary-500 to-green-500',
  },
  city: {
    label: 'City Trip',
    icon: 'ri-building-line',
    gradient: 'from-purple-500 to-pink-500',
  },
  road: {
    label: 'Road Trip',
    icon: 'ri-road-map-line',
    gradient: 'from-amber-500 to-orange-500',
  },
  custom: {
    label: 'Custom',
    icon: 'ri-map-line',
    gradient: 'from-gray-500 to-gray-700',
  },
};

// Expense categories with their icons and colors
export const EXPENSE_CATEGORIES = {
  food: {
    label: 'Food & Drinks',
    icon: 'ri-restaurant-line',
    color: 'green',
  },
  transport: {
    label: 'Transportation',
    icon: 'ri-taxi-line',
    color: 'blue',
  },
  accommodation: {
    label: 'Accommodation',
    icon: 'ri-home-line',
    color: 'purple',
  },
  activities: {
    label: 'Activities',
    icon: 'ri-gamepad-line',
    color: 'amber',
  },
  shopping: {
    label: 'Shopping',
    icon: 'ri-shopping-bag-line',
    color: 'pink',
  },
  other: {
    label: 'Other',
    icon: 'ri-money-dollar-circle-line',
    color: 'gray',
  },
};



// Activity types for the activity feed
export const ACTIVITY_TYPES = {
  trip_created: {
    icon: 'ri-map-pin-line',
    color: 'primary',
  },
  member_joined: {
    icon: 'ri-user-add-line',
    color: 'purple',
  },
  item_added: {
    icon: 'ri-shopping-basket-line',
    color: 'blue',
  },
  item_completed: {
    icon: 'ri-checkbox-circle-line',
    color: 'green',
  },
  expense_added: {
    icon: 'ri-money-dollar-circle-line',
    color: 'green',
  },
};

// Default packing suggestions by trip type
export const DEFAULT_PACKING_ITEMS = {
  beach: [
    'Swimsuit',
    'Sunscreen',
    'Beach towel',
    'Sunglasses',
    'Hat',
    'Flip flops',
  ],
  camping: [
    'Tent',
    'Sleeping bag',
    'Flashlight',
    'First aid kit',
    'Insect repellent',
    'Multi-tool',
  ],
  city: [
    'Comfortable shoes',
    'City map',
    'Camera',
    'Power bank',
    'Transit pass',
    'Umbrella',
  ],
  road: [
    'Snacks',
    'Water bottles',
    'Playlist',
    'Phone charger',
    'Sunglasses',
    'Pillows',
  ],
};

// API endpoints
export const API_ENDPOINTS = {
  trips: '/api/trips',
  categories: '/api/categories',
  groceryItems: (tripId: number) => `/api/trips/${tripId}/grocery`,
  expenses: (tripId: number) => `/api/trips/${tripId}/expenses`,
  packingItems: (tripId: number) => `/api/trips/${tripId}/packing`,
  chatMessages: (tripId: number) => `/api/trips/${tripId}/chat`,
  activities: (tripId: number) => `/api/trips/${tripId}/activities`,
  recentActivities: '/api/recent-activities',
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
  },
};
