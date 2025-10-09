import { NextResponse } from "next/server";

const QUIZ_BASE = "https://wayground.com/quiz/";

// Reuse cookie from prior calls (kept for authenticated fetch)
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; x-csrf-token=nRinBo6L-Q9iD74EZRk3w8O9x_6-X_u0cmR8; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759843286276; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759843286275%7Cl%3A1759843286277; _sid=oHYUmG7GMhyG7l3BW6LeYV_TmSw3cmpSyDdRboxBOT-qgac9j--oGZN-6asdyLKi-r4tPfN3O0gyyjgVmuNw8FMu-5W-DnKbNFJCzROila7_TNIOS-93YIGFdhMuoBJnZIGPwzes9U7oIsbTXhofqw6XoMpudmPEyPVt.v3H3d5gUoHEctSjB1CxuqQ.6QvEQDfIYuZklzQM; first_session=%7B%22visits%22%3A808%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759846887859%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759846879129%2C%22time_since_last_visit%22%3A8730%2C%22version%22%3A0.4%7D; suid=cbccfe08-29fe-491c-bfbf-07faa7486fb0; _csrf=8-kxnR3tzNUhRsmaWpsq71BrXk8; x-csrf-token=8-kxnR3tzNUhRsmaWpsq71BrXk8; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A242ecbb5-58fe-41e1-44b4-e8704ab252ad%7Ce%3A1759854456125%7Cc%3A1759843286276%7Cl%3A1759847256125`;

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