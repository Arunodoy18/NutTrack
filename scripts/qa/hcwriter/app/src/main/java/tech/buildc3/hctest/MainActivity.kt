package tech.buildc3.hctest

import android.os.Bundle
import android.util.Log
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset

/** TEST TOOL ONLY (never shipped): writes one sample run + weigh-in into Health Connect (cmd=insert) and removes them (cmd=delete). */
class MainActivity : AppCompatActivity() {
    private val perms = setOf(
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
        HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class),
    )
    private val ask = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        Log.i("HCTEST", "granted=${granted.size}/${perms.size}"); run()
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        setContentView(TextView(this).apply { text = "HC test writer"; textSize = 18f; setPadding(40, 120, 40, 40) })
        val st = HealthConnectClient.getSdkStatus(this)
        Log.i("HCTEST", "sdkStatus=$st (3 = ready)")
        if (st != HealthConnectClient.SDK_AVAILABLE) { finish(); return }
        lifecycleScope.launch {
            val client = HealthConnectClient.getOrCreate(this@MainActivity)
            if (client.permissionController.getGrantedPermissions().containsAll(perms)) run() else ask.launch(perms)
        }
    }

    private fun run() = lifecycleScope.launch {
        val client = HealthConnectClient.getOrCreate(this@MainActivity)
        try {
            when (intent.getStringExtra("cmd")) {
                "insert" -> {
                    val end = Instant.now().minusSeconds(3600); val start = end.minusSeconds(30 * 60)
                    val off = ZoneOffset.UTC
                    client.insertRecords(listOf(
                        ExerciseSessionRecord(startTime = start, startZoneOffset = off, endTime = end, endZoneOffset = off, exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_RUNNING, title = "Nura test run", metadata = Metadata.manualEntry(clientRecordId = "nura-test-run")),
                        ActiveCaloriesBurnedRecord(startTime = start, startZoneOffset = off, endTime = end, endZoneOffset = off, energy = Energy.kilocalories(280.0), metadata = Metadata.manualEntry(clientRecordId = "nura-test-cal")),
                        WeightRecord(time = Instant.now().minusSeconds(1800), zoneOffset = off, weight = Mass.kilograms(70.5), metadata = Metadata.manualEntry(clientRecordId = "nura-test-weight")),
                    ))
                    Log.i("HCTEST", "INSERTED 3 records")
                }
                "delete" -> {
                    client.deleteRecords(ExerciseSessionRecord::class, emptyList(), listOf("nura-test-run"))
                    client.deleteRecords(ActiveCaloriesBurnedRecord::class, emptyList(), listOf("nura-test-cal"))
                    client.deleteRecords(WeightRecord::class, emptyList(), listOf("nura-test-weight"))
                    Log.i("HCTEST", "DELETED")
                }
                else -> Log.i("HCTEST", "no cmd")
            }
        } catch (e: Exception) { Log.e("HCTEST", "failed: $e") }
        finish()
    }
}
