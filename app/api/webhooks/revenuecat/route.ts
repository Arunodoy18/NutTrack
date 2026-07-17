import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // RevenueCat signs webhook requests with a static token you set as the
    // "Authorization" header value in RevenueCat's webhook settings. Without
    // this check, anyone can POST a fake INITIAL_PURCHASE event with any
    // app_user_id and grant themselves premium for free.
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    if (request.headers.get('authorization') !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Verify it's a RevenueCat event
    if (!body || !body.event) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    const { event } = body;
    const { type, app_user_id } = event;

    // app_user_id is the app's own user UUID (set via Purchases.logIn in the
    // mobile app) - it's a text id, not a number, so it must be compared as-is.
    if (!app_user_id || typeof app_user_id !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // We only care about INITIAL_PURCHASE and RENEWAL events for giving premium access
    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      await db.update(users)
        .set({
          isPremium: true,
          premiumSince: new Date(),
        })
        .where(eq(users.id, app_user_id));

      console.log(`[RevenueCat] Upgraded user ${app_user_id} to premium via Google Play.`);

      return NextResponse.json({ success: true, message: 'User upgraded successfully' });
    }

    // Handle cancellations if necessary
    if (type === 'CANCELLATION' || type === 'EXPIRATION') {
      await db.update(users)
        .set({ isPremium: false })
        .where(eq(users.id, app_user_id));

      console.log(`[RevenueCat] Downgraded user ${app_user_id} to free.`);
      return NextResponse.json({ success: true, message: 'User downgraded successfully' });
    }

    // Ignore other events
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error) {
    console.error('[RevenueCat Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
