package com.example.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class FoodItem(
    val name: String,
    val calories: Int,
    val protein: Int,
    val fat: Int,
    val fiber: Int,
    val isManual: Boolean = false
)

@JsonClass(generateAdapter = true)
data class MealAnalysis(
    val foods: List<FoodItem>,
    val totalCalories: Int,
    val totalProtein: Int,
    val totalFat: Int,
    val totalFiber: Int,
    val summary: String
)

@JsonClass(generateAdapter = true)
data class DailyTotals(
    val calories: Int = 0,
    val protein: Int = 0,
    val fat: Int = 0,
    val fiber: Int = 0
)

@JsonClass(generateAdapter = true)
data class NutrientTargets(
    val calories: Int = 2000,
    val protein: Int = 80,
    val fat: Int = 65,
    val fiber: Int = 30
)

data class SavedMeal(
    val id: String,
    val timestamp: Long,
    val analysis: MealAnalysis,
    val imagePath: String? = null
)
