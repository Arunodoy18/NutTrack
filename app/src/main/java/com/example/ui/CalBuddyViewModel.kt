package com.example.ui

import android.app.Application
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.BuildConfig
import com.example.api.OpenRouterRequest
import com.example.api.OpenRouterMessage
import com.example.api.OpenRouterPart
import com.example.api.OpenRouterImageUrl
import com.example.api.OpenRouterRetrofitClient
import com.example.api.OpenRouterFoodDetectionResponse
import com.example.api.UsdaRetrofitClient
import com.example.model.DailyTotals
import com.example.model.FoodItem
import com.example.model.MealAnalysis
import com.example.model.SavedMeal
import com.example.model.NutrientTargets
import com.example.repository.CalBuddyRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

sealed interface AnalysisState {
    object Idle : AnalysisState
    data class Loading(val message: String) : AnalysisState
    data class Success(val analysis: MealAnalysis) : AnalysisState
    data class Error(val message: String) : AnalysisState
}

class CalBuddyViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = CalBuddyRepository(application)

    private val _analysisState = MutableStateFlow<AnalysisState>(AnalysisState.Idle)
    val analysisState: StateFlow<AnalysisState> = _analysisState.asStateFlow()

    private val _dailyTotals = MutableStateFlow(repository.getDailyTotals())
    val dailyTotals: StateFlow<DailyTotals> = _dailyTotals.asStateFlow()

    private val _nutrientTargets = MutableStateFlow(repository.getNutrientTargets())
    val nutrientTargets: StateFlow<NutrientTargets> = _nutrientTargets.asStateFlow()

    private val _savedMeals = MutableStateFlow(repository.getSavedMeals())
    val savedMeals: StateFlow<List<SavedMeal>> = _savedMeals.asStateFlow()

    private val _selectedImageBitmap = MutableStateFlow<Bitmap?>(null)
    val selectedImageBitmap: StateFlow<Bitmap?> = _selectedImageBitmap.asStateFlow()

    private val _activeEditingMeal = MutableStateFlow<MealAnalysis?>(null)
    val activeEditingMeal: StateFlow<MealAnalysis?> = _activeEditingMeal.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _searchResults = MutableStateFlow<List<FoodItem>>(emptyList())
    val searchResults: StateFlow<List<FoodItem>> = _searchResults.asStateFlow()

    private val _searchLoading = MutableStateFlow(false)
    val searchLoading: StateFlow<Boolean> = _searchLoading.asStateFlow()

    private val _searchError = MutableStateFlow<String?>(null)
    val searchError: StateFlow<String?> = _searchError.asStateFlow()

    private val _isPremium = MutableStateFlow(repository.isPremium())
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    private val _isPaywallOpen = MutableStateFlow(false)
    val isPaywallOpen: StateFlow<Boolean> = _isPaywallOpen.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncError = MutableStateFlow<String?>(null)
    val syncError: StateFlow<String?> = _syncError.asStateFlow()

    private val _syncSuccess = MutableStateFlow(false)
    val syncSuccess: StateFlow<Boolean> = _syncSuccess.asStateFlow()

    init {
        // Log API key configuration silently
        val key = BuildConfig.OPENROUTER_API_KEY
        Log.d("CalBuddyViewModel", "OpenRouter configured: ${key.isNotEmpty()}")
    }

    fun setSelectedImage(bitmap: Bitmap?) {
        _selectedImageBitmap.value = bitmap
        _activeEditingMeal.value = null
        _analysisState.value = AnalysisState.Idle
    }

    private fun toBase64(bitmap: Bitmap): String {
        val outputStream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
        return android.util.Base64.encodeToString(outputStream.toByteArray(), android.util.Base64.NO_WRAP)
    }

    private fun parseGrams(estimatedQuantity: String): Double {
        val regex = """(\d+)\s*(g|gram)""".toRegex(RegexOption.IGNORE_CASE)
        val match = regex.find(estimatedQuantity)
        if (match != null) {
            return match.groupValues[1].toDoubleOrNull() ?: 100.0
        }
        val digitRegex = """\d+""".toRegex()
        val valMatch = digitRegex.find(estimatedQuantity)
        if (valMatch != null) {
            val num = valMatch.value.toDoubleOrNull() ?: 100.0
            return if (num > 5000.0) 100.0 else num
        }
        return 100.0
    }

    fun analyzeMeal() {
        if (repository.checkScanLimit()) {
            _isPaywallOpen.value = true
            return
        }
        val bitmap = _selectedImageBitmap.value ?: return
        _analysisState.value = AnalysisState.Loading("Analyzing your meal...")

        viewModelScope.launch {
            try {
                val base64Image = withContext<String>(Dispatchers.IO) { toBase64(bitmap) }
                val openRouterKey = BuildConfig.OPENROUTER_API_KEY
                val usdaKey = BuildConfig.USDA_API_KEY
                val modelName = if (BuildConfig.OPENROUTER_MODEL.isNotEmpty()) BuildConfig.OPENROUTER_MODEL else "google/gemini-2.5-flash"

                if (openRouterKey.isEmpty() || openRouterKey == "YOUR_OPENROUTER_API_KEY" || openRouterKey == "MY_GEMINI_API_KEY") {
                    throw IllegalStateException("OpenRouter API key is not configured. Please use the Secrets panel in AI Studio.")
                }
                if (usdaKey.isEmpty() || usdaKey == "YOUR_USDA_API_KEY") {
                    throw IllegalStateException("USDA API key is not configured. Please use the Secrets panel in AI Studio.")
                }

                val prompt = """
                    You are a precision nutrition AI embedded in dietBuddy, a calorie tracking app.
                    
                    The user has uploaded a photo of their meal. Your job is to identify every distinct food item visible on the plate, estimate its portion weight in grams, and return structured nutritional data.
                    
                    RULES:
                    - Only identify food items you can see with reasonable confidence. Do not guess invisible items.
                    - If the image is not a food photo (blurry, non-food subject, error), return { "error": "not_food", "message": "No meal detected in this image." }
                    - Never hallucinate nutrition values. Use your trained knowledge of USDA nutritional data.
                    - Weights are estimates — be conservative, not generous. A "medium chicken breast" is 150g, not 250g.
                    - Always return valid JSON only. No markdown, no explanation, no preamble.
                    
                    OUTPUT FORMAT (strict JSON):
                    {
                      "meal_name": "Short descriptive name of the whole meal",
                      "confidence": 0.87,
                      "items": [
                        {
                          "name": "Grilled Chicken Breast",
                          "weight_g": 150,
                          "calories": 248,
                          "protein_g": 46.5,
                          "fat_g": 5.4,
                          "carbs_g": 0,
                          "fiber_g": 0
                        }
                      ],
                      "totals": {
                        "calories": 248,
                        "protein_g": 46.5,
                        "fat_g": 5.4,
                        "carbs_g": 0,
                        "fiber_g": 0
                      },
                      "notes": "Optional notes"
                    }
                """.trimIndent()

                val request = OpenRouterRequest(
                    model = modelName,
                    messages = listOf(
                        OpenRouterMessage(
                            role = "user",
                            content = listOf(
                                OpenRouterPart(type = "text", text = prompt),
                                OpenRouterPart(
                                    type = "image_url",
                                    image_url = OpenRouterImageUrl(url = "data:image/jpeg;base64,$base64Image")
                                )
                            )
                        )
                    )
                )

                // 1. Call OpenRouter to detect food items (Image Analysis)
                val rawText = try {
                    val response = withContext(Dispatchers.IO) {
                        OpenRouterRetrofitClient.service.analyzeImage(
                            authorization = "Bearer $openRouterKey",
                            request = request
                        )
                    }
                    response.choices?.firstOrNull()?.message?.content
                        ?: throw Exception("Empty choices returned")
                } catch (e: Exception) {
                    Log.e("CalBuddyViewModel", "OpenRouter call failed", e)
                    _analysisState.value = AnalysisState.Error("Could not analyze image.")
                    return@launch
                }

                // 2. Parse detected foods
                val detectedResponse = try {
                    val cleanedJson = cleanJsonString(rawText)
                    val adapter = OpenRouterRetrofitClient.moshiInstance.adapter(OpenRouterFoodDetectionResponse::class.java)
                    adapter.fromJson(cleanedJson) ?: throw Exception("JSON yielded null response")
                } catch (e: Exception) {
                    Log.e("CalBuddyViewModel", "Failed to parse detection response", e)
                    _analysisState.value = AnalysisState.Error("Unable to identify foods.")
                    return@launch
                }

                if (detectedResponse.error != null) {
                    _analysisState.value = AnalysisState.Error(detectedResponse.message ?: "Invalid meal image.")
                    return@launch
                }

                if (detectedResponse.items.isNullOrEmpty()) {
                    _analysisState.value = AnalysisState.Error("Unable to identify foods.")
                    return@launch
                }

                // Map detected items to FoodItem
                val foodItems = detectedResponse.items.map { food ->
                    FoodItem(
                        name = food.name,
                        calories = food.calories,
                        protein = food.protein_g.toInt(),
                        fat = food.fat_g.toInt(),
                        fiber = food.fiber_g.toInt(),
                        isManual = false
                    )
                }

                val totalCalories = detectedResponse.totals?.calories ?: foodItems.sumOf { it.calories }
                val totalProtein = detectedResponse.totals?.protein_g?.toInt() ?: foodItems.sumOf { it.protein }
                val totalFat = detectedResponse.totals?.fat_g?.toInt() ?: foodItems.sumOf { it.fat }
                val totalFiber = detectedResponse.totals?.fiber_g?.toInt() ?: foodItems.sumOf { it.fiber }
                val summary = detectedResponse.notes ?: "AI Scanner identified ${foodItems.size} food items."

                val mealAnalysis = MealAnalysis(
                    foods = foodItems,
                    totalCalories = totalCalories,
                    totalProtein = totalProtein,
                    totalFat = totalFat,
                    totalFiber = totalFiber,
                    summary = summary
                )

                _activeEditingMeal.value = mealAnalysis
                _analysisState.value = AnalysisState.Success(mealAnalysis)
                repository.incrementScanCount()

            } catch (e: IllegalStateException) {
                _analysisState.value = AnalysisState.Error(e.message ?: "Configuration error")
            } catch (e: Exception) {
                Log.e("CalBuddyViewModel", "Unexpected analysis error", e)
                _analysisState.value = AnalysisState.Error("Could not analyze image.")
            }
        }
    }

    private fun cleanJsonString(raw: String): String {
        var cleaned = raw.trim()
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substringAfter("```json").substringBeforeLast("```")
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substringAfter("```").substringBeforeLast("```")
        }
        return cleaned.trim()
    }

    fun startManualMeal() {
        val manualMeal = MealAnalysis(
            foods = emptyList(),
            totalCalories = 0,
            totalProtein = 0,
            totalFat = 0,
            totalFiber = 0,
            summary = "Manually created meal"
        )
        _activeEditingMeal.value = manualMeal
        _selectedImageBitmap.value = null
        _analysisState.value = AnalysisState.Success(manualMeal)
    }

    fun resetCurrentMeal() {
        _activeEditingMeal.value = null
        _selectedImageBitmap.value = null
        _analysisState.value = AnalysisState.Idle
    }

    fun searchFood(query: String) {
        _searchQuery.value = query
        if (query.trim().isEmpty()) {
            _searchResults.value = emptyList()
            _searchError.value = null
            return
        }

        _searchLoading.value = true
        _searchError.value = null

        viewModelScope.launch {
            try {
                val usdaKey = BuildConfig.USDA_API_KEY
                if (usdaKey.isEmpty() || usdaKey == "YOUR_USDA_API_KEY") {
                    throw IllegalStateException("USDA API key is not configured.")
                }

                val response = withContext(Dispatchers.IO) {
                    UsdaRetrofitClient.service.searchFoods(usdaKey, query, 15)
                }
                val foods = response.foods ?: emptyList()
                val mappedFoods = foods.map { food ->
                    var rawKcal = 0.0
                    var rawProt = 0.0
                    var rawFat = 0.0
                    var rawFib = 0.0

                    food.foodNutrients?.forEach { nut ->
                        val name = nut.nutrientName?.lowercase() ?: ""
                        val valD = nut.value ?: 0.0
                        if (name.contains("energy") || name.contains("calories") || nut.nutrientId == 1008) {
                            rawKcal = valD
                        } else if (name.contains("protein") || nut.nutrientId == 1003) {
                            rawProt = valD
                        } else if (name.contains("fat") || name.contains("lipid") || nut.nutrientId == 1004) {
                            rawFat = valD
                        } else if (name.contains("fiber") || nut.nutrientId == 1079) {
                            rawFib = valD
                        }
                    }

                    FoodItem(
                        name = food.description,
                        calories = rawKcal.toInt(),
                        protein = rawProt.toInt(),
                        fat = rawFat.toInt(),
                        fiber = rawFib.toInt(),
                        isManual = true
                    )
                }
                _searchResults.value = mappedFoods
                if (mappedFoods.isEmpty()) {
                    _searchError.value = "No food items matched tracking index."
                }
            } catch (e: Exception) {
                Log.e("CalBuddyViewModel", "Search failed", e)
                _searchError.value = "Nutrition information unavailable."
            } finally {
                _searchLoading.value = false
            }
        }
    }

    fun addFoodItemToMeal(food: FoodItem) {
        val current = _activeEditingMeal.value ?: MealAnalysis(
            foods = emptyList(),
            totalCalories = 0,
            totalProtein = 0,
            totalFat = 0,
            totalFiber = 0,
            summary = "Custom meal breakdown"
        )
        val newFoods = current.foods + food
        val newCalories = newFoods.sumOf { it.calories }
        val newProtein = newFoods.sumOf { it.protein }
        val newFat = newFoods.sumOf { it.fat }
        val newFiber = newFoods.sumOf { it.fiber }

        val newSummary = if (newFoods.any { it.isManual }) {
            "Includes manual supplement entries."
        } else {
            current.summary
        }

        val updatedAnalysis = MealAnalysis(
            foods = newFoods,
            totalCalories = newCalories,
            totalProtein = newProtein,
            totalFat = newFat,
            totalFiber = newFiber,
            summary = newSummary
        )
        _activeEditingMeal.value = updatedAnalysis
        _analysisState.value = AnalysisState.Success(updatedAnalysis)
    }

    fun removeFoodItemFromMeal(index: Int) {
        val current = _activeEditingMeal.value ?: return
        if (index !in current.foods.indices) return
        val newFoods = current.foods.toMutableList().apply { removeAt(index) }

        val newCalories = newFoods.sumOf { it.calories }
        val newProtein = newFoods.sumOf { it.protein }
        val newFat = newFoods.sumOf { it.fat }
        val newFiber = newFoods.sumOf { it.fiber }

        val updatedAnalysis = MealAnalysis(
            foods = newFoods,
            totalCalories = newCalories,
            totalProtein = newProtein,
            totalFat = newFat,
            totalFiber = newFiber,
            summary = current.summary
        )

        _activeEditingMeal.value = updatedAnalysis
        _analysisState.value = AnalysisState.Success(updatedAnalysis)
    }

    fun addMealToDailyTotals(analysis: MealAnalysis) {
        val newTotals = repository.addToDailyTotals(
            calories = analysis.totalCalories,
            protein = analysis.totalProtein,
            fat = analysis.totalFat,
            fiber = analysis.totalFiber
        )
        _dailyTotals.value = newTotals

        val meal = SavedMeal(
            id = UUID.randomUUID().toString(),
            timestamp = System.currentTimeMillis(),
            analysis = analysis
        )
        repository.saveMeal(meal)
        _savedMeals.value = repository.getSavedMeals()

        _selectedImageBitmap.value = null
        _activeEditingMeal.value = null
        _analysisState.value = AnalysisState.Idle
    }

    fun resetTodayTotals() {
        repository.resetDailyTotals()
        _dailyTotals.value = repository.getDailyTotals()
    }

    fun deleteSavedMeal(mealId: String) {
        repository.deleteMeal(mealId)
        _savedMeals.value = repository.getSavedMeals()
    }

    fun clearHistory() {
        repository.clearSavedMeals()
        _savedMeals.value = repository.getSavedMeals()
    }

    fun updateNutrientTargets(targets: NutrientTargets) {
        repository.saveNutrientTargets(targets)
        _nutrientTargets.value = targets
    }

    fun setPremium(premium: Boolean) {
        repository.setPremium(premium)
        _isPremium.value = premium
    }

    fun dismissPaywall() {
        _isPaywallOpen.value = false
    }

    fun clearSyncStatus() {
        _syncError.value = null
        _syncSuccess.value = false
    }

    fun performSync(userId: String = "guest-user-uuid") {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncError.value = null
            _syncSuccess.value = false
            try {
                // 1. Sync Goals
                val targets = repository.getNutrientTargets()
                val goalsResponse = com.example.api.SyncRetrofitClient.service.syncGoals(
                    com.example.api.SyncGoalsRequest(
                        userId = userId,
                        calories = targets.calories,
                        protein = targets.protein,
                        fat = targets.fat,
                        fiber = targets.fiber
                    )
                )
                if (goalsResponse.success && goalsResponse.goals != null) {
                    repository.saveNutrientTargets(goalsResponse.goals)
                    _nutrientTargets.value = goalsResponse.goals
                } else if (goalsResponse.error != null) {
                    throw Exception(goalsResponse.error)
                }

                // 2. Sync Meals
                val localMeals = repository.getSavedMeals()
                val mealsResponse = com.example.api.SyncRetrofitClient.service.syncMeals(
                    com.example.api.SyncMealsRequest(
                        userId = userId,
                        meals = localMeals
                    )
                )
                if (mealsResponse.success && mealsResponse.meals != null) {
                    repository.saveMealsList(mealsResponse.meals)
                    _savedMeals.value = repository.getSavedMeals()
                    _syncSuccess.value = true
                } else if (mealsResponse.error != null) {
                    throw Exception(mealsResponse.error)
                }
            } catch (e: Exception) {
                Log.e("CalBuddyViewModel", "Sync failed", e)
                _syncError.value = e.message ?: "Failed to connect to the sync server. Make sure the backend is running."
            } finally {
                _isSyncing.value = false
            }
        }
    }
}
