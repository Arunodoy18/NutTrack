import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiClient } from '../../src/lib/apiClient';
import Purchases from 'react-native-purchases';
import { isRevenueCatConfigured } from '../_layout';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/mobile/profile');
        if (response.data.success) {
          setProfile(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpgrade = async () => {
    if (!isRevenueCatConfigured) {
      Alert.alert('Coming soon', 'Premium subscriptions aren\'t available yet. Check back soon!');
      return;
    }
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        // Purchase the first available package
        const { customerInfo } = await Purchases.purchasePackage(offerings.current.availablePackages[0]);
        if (typeof customerInfo.entitlements.active['Premium'] !== "undefined") {
          Alert.alert("Success!", "You are now a Premium Member!");
          setProfile({ ...profile, isPremium: true });
        }
      } else {
        Alert.alert("Error", "No subscription packages found right now. Check back later!");
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: signOut }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all your logged meals, goals, and history. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Type nothing, just confirm - there's no undo for this.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await apiClient.delete('/api/mobile/account');
                      await signOut();
                    } catch (error: any) {
                      Alert.alert('Error', error.response?.data?.error || 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.name || user?.name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || user?.name}</Text>
        <Text style={styles.email}>{profile?.email || user?.email}</Text>
        
        {profile?.isPremium ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium Member</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: '#999' }]}>
            <Text style={styles.badgeText}>Free Plan</Text>
          </View>
        )}
      </View>

      {!profile?.isPremium && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeDesc}>Get unlimited scans, AI dietary insights, and advanced tracking for just ₹199/3-months.</Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => Linking.openURL('https://dietbuddy.buildc3.tech/privacy')}>
          <Text style={styles.deleteText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://dietbuddy.buildc3.tech/terms')}>
          <Text style={styles.deleteText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F5A623', // Gold/Orange for premium
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  upgradeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E6F4FE',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  upgradeDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
  },
  deleteText: {
    color: '#999',
    fontSize: 14,
  },
});
