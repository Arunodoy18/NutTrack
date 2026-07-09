import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify it's a RevenueCat event
    if (!body || !body.event) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    const { event } = body;
    const { type, app_user_id } = event;

    // We only care about INITIAL_PURCHASE and RENEWAL events for giving premium access
    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      const userId = parseInt(app_user_id);

      if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }

      // Upgrade the user in our database
      await db.update(users)
        .set({ 
          isPremium: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`[RevenueCat] Upgraded user ${userId} to premium via Google Play.`);
      
      return NextResponse.json({ success: true, message: 'User upgraded successfully' });
    }

    // Handle cancellations if necessary
    if (type === 'CANCELLATION' || type === 'EXPIRATION') {
      const userId = parseInt(app_user_id);
      if (!isNaN(userId)) {
        await db.update(users)
          .set({ 
            isPremium: false,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        console.log(`[RevenueCat] Downgraded user ${userId} to free.`);
      }
      return NextResponse.json({ success: true, message: 'User downgraded successfully' });
    }

    // Ignore other events
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error) {
    console.error('[RevenueCat Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
