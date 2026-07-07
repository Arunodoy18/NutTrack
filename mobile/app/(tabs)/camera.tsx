import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/lib/apiClient';

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setResult(null);
    }
  };

  const analyzeMeal = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      const response = await apiClient.post('/api/mobile/meals/analyze', {
        type: 'image',
        payload: image,
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        Alert.alert('Analysis Failed', response.data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!result) return;
    
    try {
      const mealData = {
        summary: result.summary,
        totalCalories: result.totalCalories,
        totalProtein: result.totalProtein,
        totalFat: result.totalFat,
        totalCarbs: result.totalCarbs,
        totalFiber: result.totalFiber,
        items: result.items,
        imagePath: image // We pass base64 directly for mobile currently
      };

      const response = await apiClient.post('/api/mobile/meals/save', mealData);
      
      if (response.data.success) {
        Alert.alert('Success', 'Meal logged successfully!');
        setImage(null);
        setResult(null);
      } else {
        Alert.alert('Save Failed', response.data.error);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to save meal');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {!image ? (
        <View style={styles.placeholderContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.placeholderText}>Scan your meal to get nutritional insights.</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
              <Ionicons name="image" size={24} color="#fff" />
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.imagePreview} />
          
          {!result && !analyzing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#666' }]} onPress={() => setImage(null)}>
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={analyzeMeal}>
                <Text style={styles.buttonText}>Analyze Meal</Text>
              </TouchableOpacity>
            </View>
          )}

          {analyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#208AEF" />
              <Text style={styles.loadingText}>Our AI is analyzing your food...</Text>
            </View>
          )}

          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Analysis Complete</Text>
              <Text style={styles.resultSummary}>{result.summary}</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Calories</Text>
                  <Text style={styles.statValue}>{Math.round(result.totalCalories)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Protein</Text>
                  <Text style={styles.statValue}>{Math.round(result.totalProtein)}g</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Carbs</Text>
                  <Text style={styles.statValue}>{Math.round(result.totalCarbs)}g</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>Identified Items:</Text>
                {result.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>{item.estimatedQuantity}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={saveMeal}>
                <Text style={styles.saveButtonText}>Log This Meal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#f0f0f0', marginTop: 10 }]} onPress={() => {setImage(null); setResult(null);}}>
                <Text style={[styles.saveButtonText, { color: '#666' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  placeholderText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#208AEF',
    fontSize: 16,
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultSummary: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#208AEF',
  },
  itemsList: {
    marginBottom: 20,
  },
  itemsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    color: '#333',
  },
  itemQuantity: {
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#34C759', // Green
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
