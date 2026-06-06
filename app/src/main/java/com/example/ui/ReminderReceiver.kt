package com.example.ui

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import java.util.Calendar

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val type = intent.getStringExtra("REMINDER_TYPE") ?: "General"
        Log.d("ReminderReceiver", "Received request to fire notification for $type")
        showNotification(context, type)
    }

    companion object {
        const val CHANNEL_ID = "calbuddy_reminders"
        
        fun showNotification(context: Context, type: String) {
            val title = when (type) {
                "Breakfast" -> "Breakfast Reminder! 🍳"
                "Lunch" -> "Lunchtime Reminder! 🥗"
                "Dinner" -> "Dinner Reminder! 🍲"
                else -> "Meal Tracker Reminder! 🍽️"
            }
            
            val message = when (type) {
                "Breakfast" -> "Start your day right! Log your morning meal to keep track of your goals."
                "Lunch" -> "Time for fuel! Snap a photo of your lunch or log your nutrients with AI."
                "Dinner" -> "Wrapping up the day? Check your remaining calories and log your dinner."
                else -> "Take a second to keep your food log up-to-date and reach your nutrition targets!"
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Meal Reminders",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Reminders to log breakfast, lunch, and dinner"
                }
                notificationManager.createNotificationChannel(channel)
            }

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                type.hashCode(),
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )

            val accentColor = 0xFF4F46E5.toInt() // Premium Indigo

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setColor(accentColor)
                .setContentIntent(pendingIntent)

            try {
                notificationManager.notify(type.hashCode(), builder.build())
                Log.d("ReminderReceiver", "Successfully posted notification: $title")
            } catch (e: Exception) {
                Log.e("ReminderReceiver", "Failed to show notification", e)
            }
        }

        fun scheduleReminder(context: Context, type: String, hour: Int, minute: Int) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("REMINDER_TYPE", type)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                type.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )

            val calendar = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }

            try {
                alarmManager.setInexactRepeating(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    AlarmManager.INTERVAL_DAY,
                    pendingIntent
                )
                Log.d("ReminderReceiver", "Scheduled reminder for $type at $hour:$minute")
            } catch (e: Exception) {
                Log.e("ReminderReceiver", "Alarm scheduling failed", e)
            }
        }

        fun cancelReminder(context: Context, type: String) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, ReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                type.hashCode(),
                intent,
                PendingIntent.FLAG_NO_CREATE or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.d("ReminderReceiver", "Cancelled reminder for $type")
            }
        }
    }
}
