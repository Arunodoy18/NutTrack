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
                    Analyze this meal image.
                    Identify all visible food items.
                    Return ONLY valid JSON.
                    
                    Format:
                    {
                      "foods": [
                        {
                          "name": "Chicken Breast",
                          "estimatedQuantity": "150g"
                        }
                      ]
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

                if (detectedResponse.foods.isEmpty()) {
                    _analysisState.value = AnalysisState.Error("Unable to identify foods.")
                    return@launch
                }

                // 3. Obtain nutrition details from USDA for each food item
                val foodItems = try {
                    coroutineScope {
                        detectedResponse.foods.map { food ->
                            async(Dispatchers.IO) {
                                val usdaSearch = UsdaRetrofitClient.service.searchFoods(
                                    apiKey = usdaKey,
                                    query = food.name,
                                    pageSize = 5
                                )
                                val usdaFood = usdaSearch.foods?.firstOrNull()
                                if (usdaFood != null) {
                                    var rawKcal = 0.0
                                    var rawProt = 0.0
                                    var rawFat = 0.0
                                    var rawFib = 0.0

                                    usdaFood.foodNutrients?.forEach { nut ->
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

                                    val grams = parseGrams(food.estimatedQuantity)
                                    val scale = grams / 100.0

                                    FoodItem(
                                        name = usdaFood.description,
                                        calories = (rawKcal * scale).toInt(),
                                        protein = (rawProt * scale).toInt(),
                                        fat = (rawFat * scale).toInt(),
                                        fiber = (rawFib * scale).toInt(),
                                        isManual = false
                                    )
                                } else {
                                    throw Exception("USDA search found no matches for ${food.name}")
                                }
                            }
                        }.awaitAll()
                    }
                } catch (e: Exception) {
                    Log.e("CalBuddyViewModel", "USDA search failed", e)
                    _analysisState.value = AnalysisState.Error("Nutrition information unavailable.")
                    return@launch
                }

                val totalCalories = foodItems.sumOf { it.calories }
                val totalProtein = foodItems.sumOf { it.protein }
                val totalFat = foodItems.sumOf { it.fat }
                val totalFiber = foodItems.sumOf { it.fiber }
                val summary = "An elegant meal analyzed. ${foodItems.size} components identified and matched to national USDA guidelines."

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
}
