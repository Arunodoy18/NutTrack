import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import { PostHogProvider } from 'posthog-react-native';

// Initialize Sentry
Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});

// Initialize PostHog
export const posthog = new PostHog('YOUR_POSTHOG_API_KEY', {
  host: 'https://us.i.posthog.com',
});

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
  }, [user, isLoading, segments]);

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
