import { NextResponse } from "next/server";

const QUICK_EDIT_BASE = "https://wayground.com/_quizserver/main/v2/quiz";

// Hardcoded cookie/csrf from provided curl for quickEdit (public visibility)
const HARDCODED_COOKIE = "";
const CSRF = "D9cIt6TyWlby79j_ngnsV7mnbfU";

export async function POST(request: Request) {
  try {
    const { quizId, cookie: cookieBody, csrf: csrfBody } = await request.json();
    if (!quizId) {
      return NextResponse.json({ error: "quizId required" }, { status: 400 });
    }
    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader = (typeof cookieBody === "string" && cookieBody.trim()) ? cookieBody.trim() : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE);
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = (typeof csrfBody === "string" && csrfBody.trim()) ? csrfBody.trim() : (headerCsrf?.trim() || CSRF);
    const url = `${QUICK_EDIT_BASE}/${encodeURIComponent(quizId)}/quickEdit`;
    const payload = {
      modifications: [
        {
          meta: {
            visibility: true,
          },
        },
        { quizMetadata: {} },
      ],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: `https://wayground.com/admin/quiz/${quizId}`,
        cookie: cookieHeader,
        "x-csrf-token": csrfToken,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(payload),
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


