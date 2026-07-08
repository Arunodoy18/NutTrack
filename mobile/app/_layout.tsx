import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import { PostHogProvider } from 'posthog-react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// Initialize Sentry
Sentry.init({
  dsn: 'https://53c1a6a71694738169d658f084e839e6@o4511699290423296.ingest.us.sentry.io/4511699308249093',
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});

// Initialize PostHog
export const posthog = new PostHog('phc_yYKrGRB3R2hJ2yrJi9GXcDAsaHKHunhtuRdN9cceUp8D', {
  host: 'https://us.i.posthog.com',
});

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initialize RevenueCat
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    // We use a placeholder key here. The user will replace this with their actual Public API Key from the RevenueCat dashboard.
    if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: 'YOUR_REVENUECAT_KEY' });
    }

    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the login page
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to the dashboard
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (user && user.id) {
      // Log the user into RevenueCat so their purchases sync with their DietBuddy account ID
      Purchases.logIn(user.id.toString());
    } else if (!user) {
      Purchases.logOut();
    }
  }, [user]);

  return <Slot />;
}

function RootLayout() {
  return (
    <PostHogProvider client={posthog}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
