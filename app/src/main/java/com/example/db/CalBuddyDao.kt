package com.example.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CalBuddyDao {
    @Query("SELECT * FROM saved_meals ORDER BY timestamp DESC")
    fun getAllMeals(): Flow<List<LocalMeal>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMeal(meal: LocalMeal)

    @Query("DELETE FROM saved_meals WHERE id = :mealId")
    suspend fun deleteMeal(mealId: String)

    @Query("DELETE FROM saved_meals")
    suspend fun clearMeals()
}
