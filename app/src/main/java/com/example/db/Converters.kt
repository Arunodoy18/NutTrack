package com.example.db

import androidx.room.TypeConverter
import com.example.api.OpenRouterRetrofitClient
import com.example.model.MealAnalysis

class Converters {
    private val moshi = OpenRouterRetrofitClient.moshiInstance
    private val mealAnalysisAdapter = moshi.adapter(MealAnalysis::class.java)

    @TypeConverter
    fun fromMealAnalysis(value: MealAnalysis?): String? {
        return value?.let { mealAnalysisAdapter.toJson(it) }
    }

    @TypeConverter
    fun toMealAnalysis(value: String?): MealAnalysis? {
        return value?.let { mealAnalysisAdapter.fromJson(it) }
    }
}
