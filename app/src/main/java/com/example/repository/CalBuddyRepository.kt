package com.example.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.api.OpenRouterRetrofitClient
import com.example.model.DailyTotals
import com.example.model.MealAnalysis
import com.example.model.SavedMeal
import com.example.model.NutrientTargets
import com.squareup.moshi.Types

class CalBuddyRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("calbuddy_prefs", Context.MODE_PRIVATE)
    private val moshi = OpenRouterRetrofitClient.moshiInstance
    private val mealListAdapter = moshi.adapter<List<SavedMeal>>(
        Types.newParameterizedType(List::class.java, SavedMeal::class.java)
    )

    companion object {
        private const val KEY_CALORIES = "total_calories"
        private const val KEY_PROTEIN = "total_protein"
        private const val KEY_FAT = "total_fat"
        private const val KEY_FIBER = "total_fiber"
        private const val KEY_SAVED_MEALS = "saved_meals"
        private const val KEY_TARGET_CALORIES = "target_calories"
        private const val KEY_TARGET_PROTEIN = "target_protein"
        private const val KEY_TARGET_FAT = "target_fat"
        private const val KEY_TARGET_FIBER = "target_fiber"
    }

    fun getNutrientTargets(): NutrientTargets {
        val calories = prefs.getInt(KEY_TARGET_CALORIES, 2000)
        val protein = prefs.getInt(KEY_TARGET_PROTEIN, 80)
        val fat = prefs.getInt(KEY_TARGET_FAT, 65)
        val fiber = prefs.getInt(KEY_TARGET_FIBER, 30)
        return NutrientTargets(calories, protein, fat, fiber)
    }

    fun saveNutrientTargets(targets: NutrientTargets) {
        prefs.edit()
            .putInt(KEY_TARGET_CALORIES, targets.calories)
            .putInt(KEY_TARGET_PROTEIN, targets.protein)
            .putInt(KEY_TARGET_FAT, targets.fat)
            .putInt(KEY_TARGET_FIBER, targets.fiber)
            .apply()
    }

    fun getDailyTotals(): DailyTotals {
        val calories = prefs.getInt(KEY_CALORIES, 0)
        val protein = prefs.getInt(KEY_PROTEIN, 0)
        val fat = prefs.getInt(KEY_FAT, 0)
        val fiber = prefs.getInt(KEY_FIBER, 0)
        return DailyTotals(calories, protein, fat, fiber)
    }

    fun saveDailyTotals(totals: DailyTotals) {
        prefs.edit()
            .putInt(KEY_CALORIES, totals.calories)
            .putInt(KEY_PROTEIN, totals.protein)
            .putInt(KEY_FAT, totals.fat)
            .putInt(KEY_FIBER, totals.fiber)
            .apply()
    }

    fun addToDailyTotals(calories: Int, protein: Int, fat: Int, fiber: Int): DailyTotals {
        val current = getDailyTotals()
        val newTotals = DailyTotals(
            calories = current.calories + calories,
            protein = current.protein + protein,
            fat = current.fat + fat,
            fiber = current.fiber + fiber
        )
        saveDailyTotals(newTotals)
        return newTotals
    }

    fun resetDailyTotals() {
        saveDailyTotals(DailyTotals(0, 0, 0, 0))
    }

    fun getSavedMeals(): List<SavedMeal> {
        val json = prefs.getString(KEY_SAVED_MEALS, null) ?: return emptyList()
        return try {
            mealListAdapter.fromJson(json) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveMeal(meal: SavedMeal) {
        val currentMeals = getSavedMeals().toMutableList()
        currentMeals.add(0, meal) // Add to the top of the history list
        val json = mealListAdapter.toJson(currentMeals)
        prefs.edit().putString(KEY_SAVED_MEALS, json).apply()
    }

    fun deleteMeal(mealId: String) {
        val currentMeals = getSavedMeals().toMutableList()
        currentMeals.removeAll { it.id == mealId }
        val json = mealListAdapter.toJson(currentMeals)
        prefs.edit().putString(KEY_SAVED_MEALS, json).apply()
    }

    fun clearSavedMeals() {
        prefs.edit().remove(KEY_SAVED_MEALS).apply()
    }
}
