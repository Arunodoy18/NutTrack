import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { apiClient } from '../../src/lib/apiClient';

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/api/mobile/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
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
        <Text>Failed to load data</Text>
      </View>
    );
  }

  const { todayTotals, currentGoals, todayMeals } = data;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today&apos;s Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Calories</Text>
            <Text style={styles.statValue}>{Math.round(todayTotals.calories)}</Text>
            <Text style={styles.statGoal}>/ {currentGoals.calories} kcal</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Protein</Text>
            <Text style={styles.statValue}>{Math.round(todayTotals.protein)}g</Text>
            <Text style={styles.statGoal}>/ {currentGoals.protein}g</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Fat</Text>
            <Text style={styles.statValue}>{Math.round(todayTotals.fat)}g</Text>
            <Text style={styles.statGoal}>/ {currentGoals.fat}g</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Carbs</Text>
            <Text style={styles.statValue}>{Math.round(todayTotals.carbs)}g</Text>
            <Text style={styles.statGoal}>/ {currentGoals.carbs}g</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s Meals</Text>
      {todayMeals.length === 0 ? (
        <Text style={styles.emptyText}>No meals logged today yet.</Text>
      ) : (
        todayMeals.map((meal: any) => (
          <View key={meal.id} style={styles.mealCard}>
            <Text style={styles.mealSummary}>{meal.summary}</Text>
            <Text style={styles.mealCals}>{meal.totalCalories} kcal</Text>
          </View>
        ))
      )}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#208AEF',
  },
  statGoal: {
    fontSize: 12,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mealSummary: {
    fontSize: 16,
    flex: 1,
  },
  mealCals: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#208AEF',
  }
});
