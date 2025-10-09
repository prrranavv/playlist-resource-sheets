import { NextResponse } from "next/server";

const QUIZ_BASE = "https://wayground.com/quiz/";

// Fallback cookie - empty by default, use fresh cookies from login
const HARDCODED_COOKIE = "";

function extractCsrfFromCookie(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/x-csrf-token=([^;]+)/);
  return match ? match[1] : undefined;
}

export async function POST(request: Request) {
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || undefined;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const { quizIds, cookieOverride } = await request.json();
    
    console.log(`[fetch-quiz-keys] Received ${quizIds?.length || 0} quiz IDs`);
    console.log(`[fetch-quiz-keys] Has header cookie: ${!!headerCookie}`);
    console.log(`[fetch-quiz-keys] Has cookie override: ${!!cookieOverride}`);
    console.log(`[fetch-quiz-keys] Has env cookie: ${!!process.env.WAYGROUND_COOKIE}`);
    
    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json({ error: "quizIds array required" }, { status: 400 });
    }

    const useCookie = (typeof headerCookie === "string" && headerCookie.trim()) ? headerCookie.trim() : ((typeof cookieOverride === "string" && cookieOverride.trim()) ? cookieOverride.trim() : (process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE));
    const useCsrf = headerCsrf || extractCsrfFromCookie(useCookie) || "nRinBo6L-Q9iD74EZRk3w8O9x_6-X_u0cmR8";
    
    console.log(`[fetch-quiz-keys] Using cookie source: ${headerCookie ? 'header' : (cookieOverride ? 'override' : (process.env.WAYGROUND_COOKIE ? 'env' : 'hardcoded'))}`);
    console.log(`[fetch-quiz-keys] Cookie preview: ${useCookie.substring(0, 100)}...`);
    console.log(`[fetch-quiz-keys] Using CSRF: ${useCsrf}`);

    const results: Record<string, string | null> = {};
    const versions: Record<string, string | null> = {};
    
    // Process only 1 ID per API call to avoid rate limiting
    const idsToProcess = quizIds.slice(0, 1); // Max 1 ID per call
    
    for (const id of idsToProcess) {
      try {
        console.log(`[fetch-quiz-keys] Fetching quiz ID: ${id}`);
        const res = await fetch(QUIZ_BASE + encodeURIComponent(id), {
          headers: {
            accept: "application/json, text/plain, */*",
            cookie: useCookie,
            "x-csrf-token": useCsrf,
            "x-requested-with": "XMLHttpRequest",
            "x-component-type": "adminv3",
            referer: `https://wayground.com/quiz/${id}`,
            origin: "https://wayground.com",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          },
        });
        
        console.log(`[fetch-quiz-keys] Response status for ${id}: ${res.status}`);
        const text = await res.text();
        console.log(`[fetch-quiz-keys] Response text length for ${id}: ${text.length} chars`);
        
        try {
          const data = JSON.parse(text);
          console.log(`[fetch-quiz-keys] Parsed JSON for ${id}:`, JSON.stringify(data, null, 2).substring(0, 500));
          
          const key = (data?.data?.draft?.aiCreateMeta?.quizGenKey || data?.draft?.aiCreateMeta?.quizGenKey || data?.aiCreateMeta?.quizGenKey) as string | undefined;
          const version = (data?.data?.quiz?.draftVersion || data?.quiz?.draftVersion) as string | undefined;
          
          console.log(`[fetch-quiz-keys] Extracted for ${id}: quizGenKey=${key}, draftVersion=${version}`);
          
          results[id] = key ?? null;
          versions[id] = version ?? null;
        } catch (parseErr) {
          console.error(`[fetch-quiz-keys] JSON parse error for ${id}:`, parseErr);
          console.error(`[fetch-quiz-keys] Raw text for ${id}:`, text.substring(0, 500));
          results[id] = null;
          versions[id] = null;
        }
      } catch (fetchErr) {
        console.error(`[fetch-quiz-keys] Fetch error for ${id}:`, fetchErr);
        results[id] = null;
        versions[id] = null;
      }
    }

    return NextResponse.json({ quizGenKeysById: results, draftVersionById: versions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}