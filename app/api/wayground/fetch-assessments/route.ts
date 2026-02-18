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

type QuizSummary = { id: string; title: string; createdAt?: string };

function pushIfValid(results: Map<string, QuizSummary>, id: unknown, title: unknown, createdAt?: unknown) {
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) && typeof title === "string" && title.length > 0) {
    if (!results.has(id)) {
      results.set(id, { 
        id, 
        title,
        createdAt: typeof createdAt === "string" ? createdAt : undefined
      });
    }
  }
}

function collectQuizSummaries(value: unknown, results: Map<string, QuizSummary>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) collectQuizSummaries(v, results);
    return;
  }
  if (typeof value !== "object") return;

  const obj: Record<string, unknown> = value as Record<string, unknown>;
  // Extract createdAt
  const createdAt = (obj["createdAt"] as string | undefined) || 
                    ((obj["quiz"] as Record<string, unknown> | undefined)?.["createdAt"] as string | undefined);
  
  // Prefer explicit quiz/draft structures if present
  const quizObj = obj["quiz"] as { _id?: string; id?: string; name?: string; createdAt?: string } | undefined;
  if (quizObj && typeof quizObj === "object") {
    const id = quizObj._id || quizObj.id;
    const draftObj = obj["draft"] as { name?: string } | undefined;
    const title = draftObj?.name || quizObj.name || (obj["name"] as string | undefined) || (obj["title"] as string | undefined);
    pushIfValid(results, id, title, createdAt || quizObj.createdAt);
  }
  const draftObj2 = obj["draft"] as { name?: string } | undefined;
  if (draftObj2 && typeof draftObj2 === "object") {
    const title = draftObj2.name || (obj["name"] as string | undefined) || (obj["title"] as string | undefined);
    const quizObj2 = obj["quiz"] as { _id?: string; id?: string; createdAt?: string } | undefined;
    const id = quizObj2?._id || quizObj2?.id || (obj["_id"] as string | undefined) || (obj["id"] as string | undefined);
    pushIfValid(results, id, title, createdAt || quizObj2?.createdAt);
  }
  // Fallback: only when object looks like a quiz doc
  const isQuizType = obj["type"] === "quiz" || (obj["hasDraftVersion"] as boolean | undefined) === true;
  if (isQuizType) {
    pushIfValid(results, (obj["_id"] as string | undefined) || (obj["id"] as string | undefined), (obj["name"] as string | undefined) || (obj["title"] as string | undefined), createdAt);
  }

  for (const v of Object.values(obj)) collectQuizSummaries(v, results);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, text };
  }
}

export async function POST(request: Request) {
  console.log('[api:wayground:fetch-assessments] Request received');
  try {
    // Dynamic cookie handling: prioritize header > env > hardcoded
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = headerCsrf || extractCsrfFromCookie(headerCookie) || HARDCODED_CSRF;

    const body = {
      searchTerm: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      activityTypes: ["quiz"],
      tab: "drafts",
      _: "uqF9It",
    };

    console.log('[api:wayground:fetch-assessments] Fetching assessment library from Wayground');
    const size = 100;
    let from = 0;
    let pagesFetched = 0;
    const map = new Map<string, QuizSummary>();

    while (pagesFetched < 20) { // 20 * 100 = up to 2000 items
      const url = new URL(SEARCH_ENDPOINT);
      url.searchParams.set("from", String(from));
      url.searchParams.set("size", String(size));

      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22quiz%22]",
        cookie: headerCookie,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
      };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const pageRes = await fetchJson(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      console.log(`[api:wayground:fetch-assessments] Page ${pagesFetched + 1} response status: ${pageRes.status}, ok: ${pageRes.ok}`);

      if (!pageRes.ok) {
        let errorText = 'No response text';
        if ('text' in pageRes) {
          const textVal = (pageRes as { text: unknown }).text;
          errorText = typeof textVal === 'string' ? textVal : String(textVal);
        }
        console.error(`[api:wayground:fetch-assessments] Wayground API error (${pageRes.status}): ${errorText.substring(0, 500)}`);
        if (pagesFetched === 0) {
          return NextResponse.json({
            error: `Wayground API returned ${pageRes.status}`,
            details: errorText.substring(0, 500)
          }, { status: 500 });
        }
        break;
      }

      if (!('json' in pageRes)) {
        let errorText = 'No response text';
        if ('text' in pageRes) {
          const textVal = (pageRes as { text: unknown }).text;
          errorText = typeof textVal === 'string' ? textVal : String(textVal);
        }
        console.error(`[api:wayground:fetch-assessments] Failed to parse Wayground response: ${errorText.substring(0, 500)}`);
        if (pagesFetched === 0) {
          return NextResponse.json({
            error: 'Failed to parse Wayground response',
            details: errorText.substring(0, 500)
          }, { status: 500 });
        }
        break;
      }

      collectQuizSummaries(pageRes.json, map);
      pagesFetched += 1;
      from += size;

      type PageJson = { hits?: unknown[] };
      const hitsLen = (pageRes.json as PageJson)?.hits?.length as number | undefined;
      if (hitsLen !== undefined && hitsLen < size) break;
    }

    const quizzes = Array.from(map.values()).slice(0, 2000);

    console.log(`[api:wayground:fetch-assessments] Successfully fetched ${pagesFetched} pages`);
    console.log(`[api:wayground:fetch-assessments] Found ${quizzes.length} assessments`);

    return NextResponse.json({
      quizIds: quizzes.map(q => q.id),
      quizzes,
      raw: { pagesFetched }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:fetch-assessments] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


