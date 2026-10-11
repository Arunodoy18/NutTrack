import { addIngredientsToGroceryListAction } from "@/app/actions";
import { enqueueOp } from "@/lib/offlineQueue";

/** Add to the grocery list now, or save on this phone and add it when back online. */
export async function addToGrocery(userId: string, accountUserId: string, items: string[]): Promise<{ ok: boolean; added?: number; queued?: boolean }> {
  const queue = async () => {
    await enqueueOp({ userId, ownerId: accountUserId, kind: "grocery_add", eatenAt: Date.now(), groceryItems: items.slice(0, 80) });
    return { ok: true, queued: true };
  };
  if (typeof navigator !== "undefined" && !navigator.onLine) return queue();
  try {
    const res = await addIngredientsToGroceryListAction(items);
    return res.success ? { ok: true, added: res.added ?? 0 } : { ok: false };
  } catch {
    return queue(); // network dropped mid-request
  }
}

export const groceryToast = (r: { ok: boolean; added?: number; queued?: boolean }) =>
  !r.ok ? "Couldn't update the grocery list" : r.queued ? "Saved — will be added to your grocery list when you're online" : (r.added ?? 0) > 0 ? `Added ${r.added} items to your grocery list` : "Already on your grocery list";
