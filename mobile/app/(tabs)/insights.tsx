import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { apiClient } from '../../src/lib/apiClient';

export default function InsightsScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      const response = await apiClient.get('/api/mobile/insights?range=7');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Failed to load insights.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Last 7 Days</Text>
      
      {data.map((day: any, idx: number) => (
        <View key={idx} style={styles.dayCard}>
          <Text style={styles.dayDate}>{day.day} - {day.dateStr}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Calories</Text>
              <Text style={styles.statValue}>{Math.round(day.calories)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Protein</Text>
              <Text style={styles.statValue}>{Math.round(day.protein)}g</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Carbs</Text>
              <Text style={styles.statValue}>{Math.round(day.carbs)}g</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Fat</Text>
              <Text style={styles.statValue}>{Math.round(day.fat)}g</Text>
            </View>
          </View>
        </View>
      ))}
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#208AEF',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
