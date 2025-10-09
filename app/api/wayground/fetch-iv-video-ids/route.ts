import { NextResponse } from "next/server";

const QUIZ_BASE = "https://wayground.com/quiz/";

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
    const { quizIds } = await request.json();
    
    console.log(`[fetch-iv-video-ids] Received ${quizIds?.length || 0} IV quiz IDs`);
    console.log(`[fetch-iv-video-ids] Has header cookie: ${!!headerCookie}`);
    
    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json({ error: "quizIds array required" }, { status: 400 });
    }

    const useCookie = (typeof headerCookie === "string" && headerCookie.trim()) 
      ? headerCookie.trim() 
      : (process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE);
    const useCsrf = headerCsrf || extractCsrfFromCookie(useCookie) || "nRinBo6L-Q9iD74EZRk3w8O9x_6-X_u0cmR8";
    
    console.log(`[fetch-iv-video-ids] Using cookie source: ${headerCookie ? 'header' : (process.env.WAYGROUND_COOKIE ? 'env' : 'hardcoded')}`);
    console.log(`[fetch-iv-video-ids] Cookie preview: ${useCookie.substring(0, 100)}...`);

    const results: Record<string, string | null> = {};
    const titles: Record<string, string | null> = {};
    
    // Process only 1 ID per API call to avoid rate limiting
    const idsToProcess = quizIds.slice(0, 1); // Max 1 ID per call
    
    for (const id of idsToProcess) {
      try {
        console.log(`[fetch-iv-video-ids] Fetching IV quiz ID: ${id}`);
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
        
        console.log(`[fetch-iv-video-ids] Response status for ${id}: ${res.status}`);
        const text = await res.text();
        console.log(`[fetch-iv-video-ids] Response text length for ${id}: ${text.length} chars`);
        
        try {
          const data = JSON.parse(text);
          
          // Extract video ID from IV quiz (check both draft and published)
          const draftMedia = data?.data?.draft?.questions?.[0]?.structure?.query?.media?.[0] 
            || data?.draft?.questions?.[0]?.structure?.query?.media?.[0];
          const quizMedia = data?.data?.quiz?.questions?.[0]?.structure?.query?.media?.[0]
            || data?.quiz?.questions?.[0]?.structure?.query?.media?.[0];
          const media = draftMedia || quizMedia;
          
          let videoId = media?.meta?.videoId as string | undefined;
          const urlStr = media?.url as string | undefined;
          
          if (!videoId && urlStr) {
            try {
              const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
              const v = u.searchParams.get("v");
              if (v) videoId = v;
            } catch {}
          }
          
          // Extract title from IV quiz (check both draft and published)
          const title = (data?.data?.draft?.info?.name 
            || data?.draft?.info?.name 
            || data?.data?.quiz?.info?.name 
            || data?.quiz?.info?.name) as string | undefined;
          
          console.log(`[fetch-iv-video-ids] Extracted video ID for ${id}: ${videoId || 'null'}`);
          console.log(`[fetch-iv-video-ids] Extracted title for ${id}: ${title || 'null'}`);
          results[id] = videoId ?? null;
          titles[id] = title ?? null;
        } catch (parseErr) {
          console.error(`[fetch-iv-video-ids] JSON parse error for ${id}:`, parseErr);
          console.error(`[fetch-iv-video-ids] Raw text for ${id}:`, text.substring(0, 500));
          results[id] = null;
          titles[id] = null;
        }
      } catch (fetchErr) {
        console.error(`[fetch-iv-video-ids] Fetch error for ${id}:`, fetchErr);
        results[id] = null;
        titles[id] = null;
      }
    }

    return NextResponse.json({ videoIdsById: results, titlesById: titles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

