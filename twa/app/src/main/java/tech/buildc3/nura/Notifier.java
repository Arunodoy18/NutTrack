package tech.buildc3.nura;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Local reminder notifications (delivered by polling, so no Firebase / Google services needed). */
final class Notifier {
    static final String CHANNEL = "reminders";

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, ctx.getString(R.string.reminders_channel), NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(ctx.getString(R.string.reminders_channel_desc));
        ch.enableLights(true); ch.setLightColor(Color.parseColor("#FC4C02"));
        ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    /** @param path in-app path to open on tap (must start with "/") */
    static void show(Context ctx, String title, String body, String path, String tag) {
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return;
        ensureChannel(ctx);
        Intent open = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (path != null && path.startsWith("/") && !path.startsWith("//")) open.putExtra("path", path);
        PendingIntent pi = PendingIntent.getActivity(ctx, tag == null ? 0 : tag.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_nura).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(Color.parseColor("#FC4C02")).setAutoCancel(true).setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        try { NotificationManagerCompat.from(ctx).notify(tag, 1, b.build()); } catch (SecurityException ignore) { /* permission revoked */ }
    }
}
