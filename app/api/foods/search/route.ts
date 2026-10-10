import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/access";
import { checkAuthRateLimit } from "@/lib/rateLimit";
import { mapOffProduct } from "@/lib/openfoodfacts";

export const maxDuration = 20;

/** Per-100 g values for an OpenFoodFacts search hit (the app shows these like any other food). */
function per100FromOff(p: any) {
  const n = p.nutriments || {};
  const v = (k: string) => { const x = Number(n[`${k}_100g`] ?? n[k]); return Number.isFinite(x) && x >= 0 ? x : 0; };
  const sodiumG = v("sodium"); // OFF stores sodium in grams per 100 g
  return {
    kcal: Math.round(v("energy-kcal")), protein: Math.round(v("proteins") * 10) / 10, fat: Math.round(v("fat") * 10) / 10,
    carbs: Math.round(v("carbohydrates") * 10) / 10, fiber: Math.round(v("fiber") * 10) / 10,
    sodium: Math.round(sodiumG * 1000), iron: 0, calcium: 0, vitaminC: 0, potassium: 0,
  };
}

/** Packaged-food search (OpenFoodFacts) for things the built-in database doesn't have. */
export async function GET(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ success: true, results: [] });
  if (!(await checkAuthRateLimit(`foodsearch:${me}`))) return NextResponse.json({ error: "Too many searches. Try again in a moment." }, { status: 429 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=code,product_name,generic_name,brands,serving_size,serving_quantity,nutriments&sort_by=unique_scans_n`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Nura/1.0 (nutrition tracker; contact: support@nura.app)" } });
    if (!res.ok) throw new Error(`OFF ${res.status}`);
    const json = await res.json();
    const results = (json.products ?? [])
      .map((p: any) => ({ p, mapped: mapOffProduct(p) }))
      .filter((x: any) => x.mapped && x.mapped.totalCalories > 0)
      .slice(0, 10)
      .map(({ p, mapped }: any) => {
        const servingG = Number(p.serving_quantity);
        return {
          id: `off:${p.code}`,
          name: mapped.name,
          brand: (p.brands || "").split(",")[0].trim() || null,
          per100: per100FromOff(p),
          servings: Number.isFinite(servingG) && servingG > 0 && servingG <= 600
            ? [{ label: p.serving_size?.trim() || `${servingG} g`, grams: servingG }, { label: "100 g", grams: 100 }]
            : [{ label: "100 g", grams: 100 }],
        };
      });
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, results: [], error: err?.name === "AbortError" ? "The food database is slow right now." : "Couldn't reach the food database." }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
