package com.example.api

import android.graphics.Bitmap
import android.util.Base64
import java.io.ByteArrayOutputStream
import com.squareup.moshi.JsonClass
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.concurrent.TimeUnit
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

@JsonClass(generateAdapter = true)
data class OpenRouterImageUrl(
    val url: String
)

@JsonClass(generateAdapter = true)
data class OpenRouterPart(
    val type: String,
    val text: String? = null,
    val image_url: OpenRouterImageUrl? = null
)

@JsonClass(generateAdapter = true)
data class OpenRouterMessage(
    val role: String,
    val content: List<OpenRouterPart>
)

@JsonClass(generateAdapter = true)
data class OpenRouterRequest(
    val model: String,
    val messages: List<OpenRouterMessage>
)

@JsonClass(generateAdapter = true)
data class OpenRouterMessageResponse(
    val content: String? = null
)

@JsonClass(generateAdapter = true)
data class OpenRouterChoice(
    val message: OpenRouterMessageResponse? = null
)

@JsonClass(generateAdapter = true)
data class OpenRouterResponse(
    val choices: List<OpenRouterChoice>? = null
)

@JsonClass(generateAdapter = true)
data class OpenRouterFoodDetection(
    val name: String,
    val weight_g: Int = 100,
    val calories: Int = 0,
    val protein_g: Double = 0.0,
    val fat_g: Double = 0.0,
    val carbs_g: Double = 0.0,
    val fiber_g: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class OpenRouterTotals(
    val calories: Int = 0,
    val protein_g: Double = 0.0,
    val fat_g: Double = 0.0,
    val carbs_g: Double = 0.0,
    val fiber_g: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class OpenRouterFoodDetectionResponse(
    val meal_name: String? = null,
    val confidence: Double? = null,
    val items: List<OpenRouterFoodDetection>? = null,
    val totals: OpenRouterTotals? = null,
    val notes: String? = null,
    val error: String? = null,
    val message: String? = null
)

interface OpenRouterApiService {
    @POST("chat/completions")
    suspend fun analyzeImage(
        @Header("Authorization") authorization: String,
        @Header("HTTP-Referer") referer: String = "https://ai.studio/build",
        @Header("X-Title") title: String = "CalBuddy",
        @Body request: OpenRouterRequest
    ): OpenRouterResponse
}

object OpenRouterRetrofitClient {
    private const val BASE_URL = "https://openrouter.ai/api/v1/"

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(90, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .build()

    val service: OpenRouterApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(OpenRouterApiService::class.java)
    }

    val moshiInstance: Moshi get() = moshi
}

fun Bitmap.toBase64(): String {
    val outputStream = ByteArrayOutputStream()
    // Compress bitmap to fit standard payload sizes while maintaining high quality
    compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
    return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
}
