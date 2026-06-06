package com.example.api

import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = true)
data class UsdaNutrient(
    val nutrientId: Int? = null,
    val nutrientName: String? = null,
    val unitName: String? = null,
    val value: Double? = null
)

@JsonClass(generateAdapter = true)
data class UsdaFood(
    val fdcId: Int,
    val description: String,
    val brandOwner: String? = null,
    val foodNutrients: List<UsdaNutrient>? = null
)

@JsonClass(generateAdapter = true)
data class UsdaSearchResponse(
    val foods: List<UsdaFood>? = null
)

interface UsdaApiService {
    @GET("fdc/v1/foods/search")
    suspend fun searchFoods(
        @Query("api_key") apiKey: String,
        @Query("query") query: String,
        @Query("pageSize") pageSize: Int = 10
    ): UsdaSearchResponse
}

object UsdaRetrofitClient {
    private const val BASE_URL = "https://api.nal.usda.gov/"

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val service: UsdaApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(UsdaApiService::class.java)
    }

    val moshiInstance: Moshi get() = moshi
}
