package com.example.api

import com.example.BuildConfig
import com.example.model.NutrientTargets
import com.example.model.SavedMeal
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = true)
data class SyncMealsRequest(
    val userId: String,
    val meals: List<SavedMeal>
)

@JsonClass(generateAdapter = true)
data class SyncMealsResponse(
    val success: Boolean,
    val meals: List<SavedMeal>? = null,
    val error: String? = null
)

@JsonClass(generateAdapter = true)
data class SyncGoalsRequest(
    val userId: String,
    val calories: Int,
    val protein: Int,
    val fat: Int,
    val fiber: Int
)

@JsonClass(generateAdapter = true)
data class SyncGoalsResponse(
    val success: Boolean,
    val goals: NutrientTargets? = null,
    val error: String? = null
)

interface SyncApiService {
    @POST("api/sync/meals")
    suspend fun syncMeals(
        @Body request: SyncMealsRequest
    ): SyncMealsResponse

    @GET("api/sync/meals")
    suspend fun getMeals(
        @Query("userId") userId: String
    ): SyncMealsResponse

    @POST("api/sync/goals")
    suspend fun syncGoals(
        @Body request: SyncGoalsRequest
    ): SyncGoalsResponse

    @GET("api/sync/goals")
    suspend fun getGoals(
        @Query("userId") userId: String
    ): SyncGoalsResponse
}

object SyncRetrofitClient {
    private val BASE_URL = BuildConfig.SYNC_API_URL

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val service: SyncApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(SyncApiService::class.java)
    }
}
