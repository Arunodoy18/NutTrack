import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import PostHog, { PostHogProvider } from 'posthog-react-native';
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

// RevenueCat needs a real Public API Key from the RevenueCat dashboard before purchases
// will work. Until EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is set, we skip configuring the SDK
// entirely rather than calling it with a placeholder key, which would fail for every user.
const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
export const isRevenueCatConfigured = Boolean(revenueCatKey);

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isRevenueCatConfigured) return;
    try {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
      if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: revenueCatKey! });
      }
    } catch (error) {
      console.error('RevenueCat configure failed', error);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the login page
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to the dashboard
      router.replace('/(tabs)/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (!isRevenueCatConfigured) return;
    try {
      if (user && user.id) {
        // Log the user into RevenueCat so their purchases sync with their DietBuddy account ID
        Purchases.logIn(user.id.toString());
      } else if (!user) {
        Purchases.logOut();
      }
    } catch (error) {
      console.error('RevenueCat logIn/logOut failed', error);
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
