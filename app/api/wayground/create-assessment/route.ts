import { NextResponse } from "next/server";

const WAYGROUND_ENDPOINT = "https://wayground.com/_aiserver/main/public/v1/socket/video/create-quiz-from-youtube-video";

// Fallback cookie/CSRF - empty by default, use fresh cookies from login
const HARDCODED_COOKIE = "";
const HARDCODED_CSRF = "";

function extractCsrfFromCookie(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const m = cookie.match(/(?:^|;\s*)x-csrf-token=([^;]+)/i) || cookie.match(/(?:^|;\s*)_csrf=([^;]+)/i);
  return m ? decodeURIComponent(m[1]) : undefined;
}

function mapSubjectToWayground(subject: string): string {
  // No mapping needed - subjects already match Wayground's expected values
  return subject;
}

async function getYouTubeDurationSeconds(videoId: string, apiKey?: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const iso: string | undefined = data?.items?.[0]?.contentDetails?.duration;
    if (!iso) return null;
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
    if (!match) return null;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  console.log('[api:wayground:create-assessment] Request received');
  try {
    const body = await request.json();
    const { videoUrl, grade, subject, duration, videoId } = body ?? {};
    
    if (!videoUrl || !grade || !subject || !videoId) {
      console.log('[api:wayground:create-assessment] Error: Missing required fields');
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`[api:wayground:create-assessment] Video: ${videoId}, Grade: ${grade}, Subject: ${subject}`);

    // Allow overriding via header/body, else fall back to env/hardcoded values
    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader: string = (typeof body?.cookie === "string" && body.cookie.trim())
      ? body.cookie.trim()
      : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE);
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken: string = (typeof body?.csrf === "string" && body.csrf.trim())
      ? body.csrf.trim()
      : (headerCsrf?.trim() || extractCsrfFromCookie(cookieHeader) || HARDCODED_CSRF);

    // Construct minimal payload matching the provided curl, keeping numQuestions = 0
    let durationSeconds: number = typeof duration === "number" ? duration : 0;
    if (!durationSeconds || durationSeconds <= 0) {
      console.log(`[api:wayground:create-assessment] Fetching video duration from YouTube API`);
      const apiKey = process.env.YOUTUBE_API_KEY;
      const fetched = await getYouTubeDurationSeconds(String(videoId), apiKey);
      if (typeof fetched === "number" && fetched > 0) {
        durationSeconds = fetched;
        console.log(`[api:wayground:create-assessment] Duration fetched: ${durationSeconds}s`);
      }
    }

    const payload = {
      videoUrl,
      params: {
        grade: String(grade),
        subject: mapSubjectToWayground(String(subject)),
        language: "English",
        numQuestions: 0,
        videoMeta: {
          duration: durationSeconds,
          startTime: 0,
          endTime: durationSeconds,
          videoId: String(videoId),
        },
        createInteractiveVideo: false,
      },
      meta: {
        uid: "68e51aed4e056e0b8daf16cb",
        quizGenView: "USING_YOUTUBE_LINK",
        genProcess: "GENERATE_FROM_CONTENT",
        skills: [],
        subtopics: [],
        source: "youtube",
      },
    };

    // Forward request to Wayground with headers from provided curl
    console.log('[api:wayground:create-assessment] Sending request to Wayground API');
    const res = await fetch(WAYGROUND_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/assessment",
        "x-csrf-token": csrfToken,
        cookie: cookieHeader,
        // Additional curl headers that may help mimic the browser
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sentry-trace": "80db6695b777420db7f8c8a61900b158-839cb0844f48521a-0",
        baggage:
          "sentry-environment=production,sentry-release=23830a981692412e5b89fbcbf8e2a7d28bbb7319,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=a0ebf273277849b1931954826b092c86,sentry-sample_rate=0.05,sentry-transaction=admin,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e51af6-ea14baa5fe6f83922276c4e0;Parent=37c9fa24fa8794dc;Sampled=1",
        "x-component-type": "adminv3",
        "x-q-request-context-path": "FeaturedPage",
        "x-q-traceid": "Root=1-68e51af6-ea14baa5fe6f83922276c4e0;Parent=37c9fa24fa8794dc;Sampled=1",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[api:wayground:create-assessment] Response status: ${res.status}`);
    const text = await res.text();
    const headers = {
      "x-upstream-status": String(res.status),
    };
    // Try to parse JSON; if fails, return plain text with status
    try {
      const data = JSON.parse(text);
      const dataObj = data as { data?: { quizGenKey?: string }; quizGenKey?: string };
      const quizGenKey = dataObj?.data?.quizGenKey || dataObj?.quizGenKey;
      if (quizGenKey) {
        console.log(`[api:wayground:create-assessment] Success - quizGenKey: ${quizGenKey}`);
      } else {
        console.log('[api:wayground:create-assessment] Success - no quizGenKey in response');
      }
      return NextResponse.json(data, { status: res.status, headers });
    } catch {
      console.log('[api:wayground:create-assessment] Response not JSON, returning as text');
      return new NextResponse(text, { status: res.status, headers });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:create-assessment] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


