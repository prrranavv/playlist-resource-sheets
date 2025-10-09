import { NextResponse } from "next/server";

const PUBLISH_BASE = "https://wayground.com/_quizserver/main/v2/quiz";

const HARDCODED_COOKIE = "";
const CSRF = "3xHamJ3szMhUH68u0CggmCSZ9xo";

export async function POST(request: Request) {
  try {
    const { quizId, draftVersion, cookie: cookieBody, csrf: csrfBody } = await request.json();
    if (!quizId || !draftVersion) {
      return NextResponse.json({ error: "quizId and draftVersion required" }, { status: 400 });
    }
    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader = (typeof cookieBody === "string" && cookieBody.trim()) ? cookieBody.trim() : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE);
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = (typeof csrfBody === "string" && csrfBody.trim()) ? csrfBody.trim() : (headerCsrf?.trim() || CSRF);
    const url = `${PUBLISH_BASE}/${encodeURIComponent(quizId)}/version/${encodeURIComponent(draftVersion)}/publish`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: `https://wayground.com/admin/quiz/${encodeURIComponent(quizId)}/edit`,
        cookie: cookieHeader,
        "x-csrf-token": csrfToken,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sentry-trace": "7f4bc57f4dbc4d3ea02fa0faa688d4e3-bf9b3c01c461e337-0",
        baggage:
          "sentry-environment=production,sentry-release=62fa76ad0f82c4a9149d0215ff19cd2bc0b6ec76,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=7f4bc57f4dbc4d3ea02fa0faa688d4e3,sentry-sample_rate=0.05,sentry-transaction=admin-quiz-quizId-edit,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e532ab-cbd65c47be408c9e60f1236d;Parent=8bc38b97c5f86d29;Sampled=1",
        "x-component-type": "adminv3",
        "x-q-request-context-path": "QuizPage",
        "x-q-traceid": "Root=1-68e532ab-cbd65c47be408c9e60f1236d;Parent=8bc38b97c5f86d29;Sampled=1",
      },
      body: JSON.stringify({ premiumUse: false }),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


