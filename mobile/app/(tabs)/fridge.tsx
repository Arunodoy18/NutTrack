import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/lib/apiClient';

export default function FridgeScreen() {
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

  const analyzeFridge = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      const response = await apiClient.post('/api/mobile/fridge/analyze', {
        image: image,
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        Alert.alert('Analysis Failed', response.data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to analyze fridge image');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {!image ? (
        <View style={styles.placeholderContainer}>
          <Ionicons name="snow-outline" size={64} color="#ccc" />
          <Text style={styles.placeholderText}>Take a photo of your fridge to get recipe ideas and nutritional insights based on what you have.</Text>
          
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

              <TouchableOpacity style={styles.actionButton} onPress={analyzeFridge}>
                <Text style={styles.buttonText}>Analyze Fridge</Text>
              </TouchableOpacity>
            </View>
          )}

          {analyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#208AEF" />
              <Text style={styles.loadingText}>Our AI is scanning your fridge...</Text>
            </View>
          )}

          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Recipe Suggestions</Text>
              
              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>Ingredients Found:</Text>
                {result.ingredients.map((item: string, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>• {item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.recipeList}>
                <Text style={styles.itemsTitle}>Recipe Ideas:</Text>
                {result.recipes.map((recipe: any, idx: number) => (
                  <View key={idx} style={styles.recipeCard}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeDesc}>{recipe.description}</Text>
                    <Text style={styles.recipeCals}>{recipe.estimatedCalories} kcal - {recipe.estimatedProtein}g protein</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={[styles.actionButton, { marginTop: 20 }]} onPress={() => {setImage(null); setResult(null);}}>
                <Text style={styles.buttonText}>Scan Another</Text>
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
    marginTop: 80,
    paddingHorizontal: 20,
  },
  placeholderText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  itemsList: {
    marginBottom: 20,
  },
  itemsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    fontSize: 16,
  },
  itemRow: {
    paddingVertical: 4,
  },
  itemName: {
    color: '#333',
    fontSize: 14,
  },
  recipeList: {
    marginTop: 10,
  },
  recipeCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recipeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recipeCals: {
    fontSize: 14,
    fontWeight: '600',
    color: '#208AEF',
  },
});
