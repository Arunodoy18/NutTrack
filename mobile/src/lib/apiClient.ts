import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// For local testing on emulator, use 10.0.2.2 for Android or localhost for iOS
// In production, this should be the deployed URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (__DEV__ 
    ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000') 
    : 'https://dietbuddy.buildc3.tech');

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from SecureStore', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
