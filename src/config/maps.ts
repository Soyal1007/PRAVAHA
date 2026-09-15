/**
 * PRAVAHA Google Maps Configuration & Key Management
 * 
 * You can set your Google Maps API key in 3 ways:
 * 1. Add it to the .env file as: VITE_GOOGLE_MAPS_API_KEY=your_key_here
 * 2. Paste it directly below into DEFAULT_GOOGLE_MAPS_KEY
 * 3. Enter it directly in the UI under Settings -> Google Maps API Key
 */

// Paste your Google Maps Demo key here if not using .env
export const DEFAULT_GOOGLE_MAPS_KEY = 'AIzaSyC-5TuGNVVN9t7gs3wzepN10hm-obLHs1s';

export const getGoogleMapsApiKey = (): string => {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && envKey.trim() !== '') {
    return envKey.trim();
  }

  const storedKey = localStorage.getItem('pravaha_google_maps_key');
  if (storedKey && storedKey.trim() !== '') {
    return storedKey.trim();
  }

  return DEFAULT_GOOGLE_MAPS_KEY.trim();
};

export const setGoogleMapsApiKey = (key: string): void => {
  if (key) {
    localStorage.setItem('pravaha_google_maps_key', key.trim());
  } else {
    localStorage.removeItem('pravaha_google_maps_key');
  }
};
