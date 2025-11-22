import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const QUIZ_BASE = "https://wayground.com/quiz/";

// Fallback cookie - empty by default, use fresh cookies from login
const HARDCODED_COOKIE = "";

function extractCsrfFromCookie(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/x-csrf-token=([^;]+)/);
  return match ? match[1] : undefined;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const fromCache: Record<string, boolean> = {}; // Track which IDs came from cache
    
    // Process only 1 ID per API call to avoid rate limiting, with 2s delay
    const idsToProcess = quizIds.slice(0, 1); // Max 1 ID per call
    
    for (const id of idsToProcess) {
      try {
        // Check database first
        console.log(`[fetch-quiz-keys] Checking database for quiz ID: ${id}`);
        const { data: existingData, error: dbError } = await supabaseAdmin
          .from('quiz_metadata')
          .select('quiz_gen_key')
          .eq('quiz_id', id)
          .single();
        
        if (!dbError && existingData && existingData.quiz_gen_key) {
          console.log(`[fetch-quiz-keys] Found quiz_gen_key in database for ${id}: ${existingData.quiz_gen_key}`);
          results[id] = existingData.quiz_gen_key;
          versions[id] = null; // Version not stored in quiz_metadata, would need separate fetch if needed
          fromCache[id] = true; // Mark as cached
          continue; // Skip API call, use database value
        }
        
        console.log(`[fetch-quiz-keys] Not found in database, fetching from API for quiz ID: ${id}`);
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
          const title = (data?.data?.draft?.info?.name || data?.draft?.info?.name || data?.data?.quiz?.info?.name || data?.quiz?.info?.name) as string | undefined;
          
          console.log(`[fetch-quiz-keys] Extracted for ${id}: quizGenKey=${key}, draftVersion=${version}, title=${title}`);
          
          results[id] = key ?? null;
          versions[id] = version ?? null;
          fromCache[id] = false; // Mark as API call
          
          // Store in database (upsert)
          if (id) {
            const { error: insertError } = await supabaseAdmin
              .from('quiz_metadata')
              .upsert({
                quiz_id: id,
                quiz_gen_key: key || null,
                youtube_video_id: null, // Always null for assessments
              }, {
                onConflict: 'quiz_id'
              });
            
            if (insertError) {
              console.error(`[fetch-quiz-keys] Error storing ${id} in database:`, insertError);
            } else {
              console.log(`[fetch-quiz-keys] Stored ${id} in database with quiz_gen_key=${key || 'null'}`);
            }
          }
        } catch (parseErr) {
          console.error(`[fetch-quiz-keys] JSON parse error for ${id}:`, parseErr);
          console.error(`[fetch-quiz-keys] Raw text for ${id}:`, text.substring(0, 500));
          results[id] = null;
          versions[id] = null;
          fromCache[id] = false; // API call attempted, even if failed
        }
      } catch (fetchErr) {
        console.error(`[fetch-quiz-keys] Fetch error for ${id}:`, fetchErr);
        results[id] = null;
        versions[id] = null;
        fromCache[id] = false; // API call attempted, even if failed
      }
      
      // Wait 2 seconds before next fetch
      if (idsToProcess.indexOf(id) < idsToProcess.length - 1) {
        await sleep(2000);
      }
    }

    return NextResponse.json({ quizGenKeysById: results, draftVersionById: versions, fromCache });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}