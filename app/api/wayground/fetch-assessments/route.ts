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

export async function POST(request: Request) {
  console.log('[api:wayground:fetch-assessments] Request received');
  try {
    // Dynamic cookie handling: prioritize header > env > hardcoded
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = headerCsrf || extractCsrfFromCookie(headerCookie) || HARDCODED_CSRF;

    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("from", "0");
    url.searchParams.set("size", "2000");

    const body = {
      searchTerm: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      activityTypes: ["quiz"],
      tab: "drafts",
      _: "uqF9It",
    };

    console.log('[api:wayground:fetch-assessments] Fetching assessment library from Wayground');
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22quiz%22]",
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
        "sentry-trace": "779477c69e394065b4c9218cf8c2c067-9a27227c92496252-0",
        baggage:
          "sentry-environment=production,sentry-release=23830a981692412e5b89fbcbf8e2a7d28bbb7319,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=779477c69e394065b4c9218cf8c2c067,sentry-sample_rate=0.05,sentry-transaction=admin-my-library-createdbyme,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e52359-ae9ad25174541c7b1cfefbf8;Parent=9b63a65568d31119;Sampled=1",
        "x-q-traceid": "Root=1-68e52359-ae9ad25174541c7b1cfefbf8;Parent=9b63a65568d31119;Sampled=1",
      },
      body: JSON.stringify(body),
    });

    console.log(`[api:wayground:fetch-assessments] Response status: ${res.status}`);

    // Check if response is OK before processing
    if (!res.ok) {
      const text = await res.text();
      console.error(`[api:wayground:fetch-assessments] Wayground API error (${res.status}): ${text.substring(0, 500)}`);
      return NextResponse.json({
        error: `Wayground API returned ${res.status}`,
        details: text.substring(0, 500)
      }, { status: 500 });
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[api:wayground:fetch-assessments] Failed to parse response as JSON');
      console.error(`[api:wayground:fetch-assessments] Response text: ${text.substring(0, 500)}`);
      return NextResponse.json({
        error: 'Failed to parse Wayground response',
        details: text.substring(0, 500)
      }, { status: 500 });
    }

    const map = new Map<string, QuizSummary>();
    collectQuizSummaries(data, map);
    const quizzes = Array.from(map.values()).slice(0, 2000);

    console.log(`[api:wayground:fetch-assessments] Found ${quizzes.length} assessments`);

    return NextResponse.json({
      quizIds: quizzes.map(q => q.id),
      quizzes,
      raw: data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:fetch-assessments] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


