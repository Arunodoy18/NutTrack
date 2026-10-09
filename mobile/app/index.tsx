import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

// Root route: without this, launching the app lands on "Unmatched Route".
export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={user ? '/(tabs)/dashboard' : '/(auth)/login'} />;
}
