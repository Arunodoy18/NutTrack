package com.example.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.model.MealAnalysis
import com.example.model.SavedMeal

@Entity(tableName = "saved_meals")
data class LocalMeal(
    @PrimaryKey val id: String,
    val timestamp: Long,
    val analysis: MealAnalysis,
    val imagePath: String?
) {
    fun toSavedMeal() = SavedMeal(
        id = id,
        timestamp = timestamp,
        analysis = analysis,
        imagePath = imagePath
    )

    companion object {
        fun fromSavedMeal(meal: SavedMeal) = LocalMeal(
            id = meal.id,
            timestamp = meal.timestamp,
            analysis = meal.analysis,
            imagePath = meal.imagePath
        )
    }
}
