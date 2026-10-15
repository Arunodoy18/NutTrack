package tech.buildc3.nura

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Health Connect for Android 9-13 (an installed Health Connect app) via Google's Jetpack client. */
object HcJetpack {
    const val PROVIDER = "com.google.android.apps.healthdata"
    const val ACTION_REQUEST = "androidx.health.ACTION_REQUEST_PERMISSIONS"
    const val EXTRA_PERMS = "androidx.health.EXTRA_REQUEST_PERMISSIONS_STRINGS"

    @JvmField
    val PERMISSIONS: Array<String> = arrayOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
    )

    /** 1 = no Health Connect on this phone, 2 = it needs an update, 3 = ready. */
    @JvmStatic
    fun status(ctx: Context): Int = when (HealthConnectClient.getSdkStatus(ctx, PROVIDER)) {
        HealthConnectClient.SDK_AVAILABLE -> 3
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> 2
        else -> 1
    }

    @JvmStatic
    fun hasPermissions(ctx: Context): Boolean = runBlocking {
        val granted = HealthConnectClient.getOrCreate(ctx, PROVIDER).permissionController.getGrantedPermissions()
        PERMISSIONS.any { it in granted }
    }

    private fun kindOf(t: Int): String = when (t) {
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING, ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "walking"
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING, ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "running"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING, ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "cycling"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL, ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "swimming"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA, ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING, ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "strength"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "hiit"
        ExerciseSessionRecord.EXERCISE_TYPE_DANCING -> "dance"
        ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON, ExerciseSessionRecord.EXERCISE_TYPE_TENNIS, ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL,
        ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AMERICAN -> "sports"
        else -> "other"
    }

    /** Reads the last [daysBack] days and returns the JSON body for /api/activity/import. */
    @JvmStatic
    fun read(ctx: Context, daysBack: Int): JSONObject = runBlocking {
        val client = HealthConnectClient.getOrCreate(ctx, PROVIDER)
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val days = JSONArray(); val workouts = JSONArray(); val weights = JSONArray()
        for (i in 0 until daysBack) {
            val d = today.minusDays(i.toLong())
            val from = d.atStartOfDay(zone).toInstant()
            val to = if (i == 0) Instant.now() else d.plusDays(1).atStartOfDay(zone).toInstant()
            val agg = client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL, ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), TimeRangeFilter.between(from, to)))
            val steps = agg[StepsRecord.COUNT_TOTAL] ?: 0L
            val kcal = agg[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
            if (steps > 0 || kcal > 0) days.put(JSONObject().put("day", d.toString()).put("steps", steps).put("activeKcal", Math.round(kcal)))
        }
        val start = today.minusDays((daysBack - 1).toLong()).atStartOfDay(zone).toInstant()
        val range = TimeRangeFilter.between(start, Instant.now())
        for (s in client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records) {
            val minutes = maxOf(1L, (s.endTime.toEpochMilli() - s.startTime.toEpochMilli()) / 60000)
            val kcal = try {
                client.aggregate(AggregateRequest(setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL), TimeRangeFilter.between(s.startTime, s.endTime)))[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
            } catch (e: Exception) { 0.0 }
            val w = JSONObject().put("externalId", s.metadata.id).put("startedAt", s.startTime.toString()).put("minutes", minutes)
                .put("kcal", Math.round(kcal)).put("kind", kindOf(s.exerciseType))
            s.title?.let { w.put("title", it) }
            workouts.put(w)
        }
        for (r in client.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records) {
            weights.put(JSONObject().put("at", r.time.toString()).put("kg", r.weight.inKilograms))
        }
        JSONObject().put("source", "health-connect").put("days", days).put("workouts", workouts).put("weights", weights)
    }
}
