import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";
// const QUIZ_BASE = "https://wayground.com/quiz/";

// Fallback cookie/CSRF - empty by default, use fresh cookies from login
const HARDCODED_COOKIE = "";
const HARDCODED_CSRF = "";

function extractCsrfFromCookie(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/x-csrf-token=([^;]+)/);
  return match ? match[1] : undefined;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
}

export async function POST(request: Request) {
  console.log('[api:wayground:fetch-interactive-map] Request received');
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = headerCsrf || extractCsrfFromCookie(headerCookie) || HARDCODED_CSRF || "Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ";
    
    if (!headerCookie) {
      console.error('[api:wayground:fetch-interactive-map] No cookie provided');
      return NextResponse.json({ error: "No authentication cookie provided" }, { status: 401 });
    }
    
    // Step 1: paginate through drafts with activityTypes:["video-quiz"] and collect quiz ids + draft versions + createdAt + titles
    const candidates = new Map<string, { draftVersion: string | null; createdAt?: string; title?: string }>(); // quizId -> {draftVersion, createdAt, title}
    let from = 0;
    const size = 2000;
    let pagesFetched = 0;
    console.log('[api:wayground:fetch-interactive-map] Fetching interactive videos from Wayground');
    while (pagesFetched < 20) { // up to 2000 items
      const url = new URL(SEARCH_ENDPOINT);
      url.searchParams.set("from", String(from));
      url.searchParams.set("size", String(size));
      
      const pageRes = await fetchJson(url.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/plain, */*",
          origin: "https://wayground.com",
          referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22video-quiz%22]",
          cookie: headerCookie,
          "x-csrf-token": csrfToken,
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          priority: "u=1, i",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-fetch-dest": "empty",
          "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
        },
        body: JSON.stringify({
          searchTerm: "",
          sortBy: "createdAt",
          sortOrder: "desc",
          activityTypes: ["video-quiz"],
          tab: "drafts",
          _: "uqF9It",
        }),
      });
      
      console.log(`[api:wayground:fetch-interactive-map] Page ${pagesFetched + 1} response status: ${pageRes.status}, ok: ${pageRes.ok}`);

      if (!pageRes.ok) {
        console.error(`[api:wayground:fetch-interactive-map] API call failed with status ${pageRes.status}`);
        let errorText = 'No response text';
        if ('text' in pageRes) {
          const textVal = (pageRes as { text: unknown }).text;
          errorText = typeof textVal === 'string' ? textVal : String(textVal);
        }
        console.error(`[api:wayground:fetch-interactive-map] Response text: ${errorText.substring(0, 500)}`);

        // If first page fails, return error instead of empty array
        if (pagesFetched === 0) {
          return NextResponse.json({
            error: `Wayground API returned ${pageRes.status}`,
            details: errorText.substring(0, 500)
          }, { status: 500 });
        }

        // For subsequent pages, break and return what we have
        break;
      }

      if (!('json' in pageRes)) {
        console.error(`[api:wayground:fetch-interactive-map] Response is not JSON`);
        let errorText = 'No response text';
        if ('text' in pageRes) {
          const textVal = (pageRes as { text: unknown }).text;
          errorText = typeof textVal === 'string' ? textVal : String(textVal);
        }
        console.error(`[api:wayground:fetch-interactive-map] Response text: ${errorText.substring(0, 500)}`);

        // If first page fails to parse, return error instead of empty array
        if (pagesFetched === 0) {
          return NextResponse.json({
            error: 'Failed to parse Wayground response',
            details: errorText.substring(0, 500)
          }, { status: 500 });
        }

        // For subsequent pages, break and return what we have
        break;
      }

      const collect = (obj: unknown) => {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach(collect); return; }
        if (typeof obj !== "object") return;

        // Common shapes to look for
        const anyObj = obj as Record<string, unknown>;
        const q = (anyObj["quiz"] as Record<string, unknown> | undefined) || anyObj;
        const type = (q as Record<string, unknown>)["type"] || anyObj["activityType"];
        const id = (q as Record<string, unknown>)["_id"] || (q as Record<string, unknown>)["id"] || anyObj["quizId"] || anyObj["_id"] || anyObj["id"];
        const dV = (q as Record<string, unknown>)["draftVersion"] || anyObj["draftVersion"] || null;
        const createdAt = (q as Record<string, unknown>)["createdAt"] || anyObj["createdAt"];
        
        // Extract title using same logic as fetch-assessments
        const quizObj = anyObj["quiz"] as { name?: string } | undefined;
        const draftObj = anyObj["draft"] as { name?: string } | undefined;
        const title = (draftObj?.name || quizObj?.name || anyObj["name"] || (q as Record<string, unknown>)["name"]) as string | undefined;
        
        if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) && (type === "video-quiz")) {
          if (!candidates.has(id)) {
            candidates.set(id, { 
              draftVersion: typeof dV === "string" ? dV : null,
              createdAt: typeof createdAt === "string" ? createdAt : undefined,
              title: typeof title === "string" ? title : undefined
            });
          }
        }
        for (const v of Object.values(anyObj)) collect(v);
      };
      
      const candidatesBefore = candidates.size;
      collect(pageRes.json);
      const candidatesAfter = candidates.size;
      console.log(`[api:wayground:fetch-interactive-map] Page ${pagesFetched + 1}: Found ${candidatesAfter - candidatesBefore} new candidates (total: ${candidatesAfter})`);

      const pageSize = size;
      pagesFetched += 1;
      from += pageSize;

      // Heuristic stop: if this page added nothing, or page smaller than requested
      // Try to read hits length if available
      type PageJson = { hits?: unknown[] };
      const hitsLen = (pageRes.json as PageJson)?.hits?.length as number | undefined;
      if (hitsLen !== undefined && hitsLen < size) break;
    }

        // Return IVs with metadata (client will fetch video IDs for recent ones only)
        const interactive = Array.from(candidates.entries()).map(([quizId, data]) => ({
          quizId,
          draftVersion: data.draftVersion,
          createdAt: data.createdAt,
          title: data.title
        }));

        console.log(`[api:wayground:fetch-interactive-map] Successfully fetched ${pagesFetched} pages`);
        console.log(`[api:wayground:fetch-interactive-map] Found ${interactive.length} interactive videos (returning first 2000)`);

        if (interactive.length === 0) {
          console.warn(`[api:wayground:fetch-interactive-map] WARNING: No interactive videos found. This might indicate an authentication issue or parsing problem.`);
        }

        return NextResponse.json({ interactive: interactive.slice(0, 2000) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:fetch-interactive-map] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


