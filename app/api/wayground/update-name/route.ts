import { NextResponse } from "next/server";

const BASE_URL = "https://wayground.com/_quizserver/main/v2/quiz";

export async function POST(request: Request) {
  console.log('[api:wayground:update-name] Request received');
  try {
    const { quizId, name, cookie: cookieBody, csrf: csrfBody } = await request.json();
    
    if (!quizId || !name) {
      console.log('[api:wayground:update-name] Error: Missing quizId or name');
      return NextResponse.json({ error: "quizId and name are required" }, { status: 400 });
    }

    console.log(`[api:wayground:update-name] Updating quiz ${quizId} name to: ${name.substring(0, 50)}...`);
    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader = (typeof cookieBody === "string" && cookieBody.trim()) 
      ? cookieBody.trim() 
      : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || "");
    
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = (typeof csrfBody === "string" && csrfBody.trim()) 
      ? csrfBody.trim() 
      : (headerCsrf?.trim() || "");

    const url = `${BASE_URL}/${encodeURIComponent(quizId)}/quickEdit`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        origin: "https://wayground.com",
        referer: `https://wayground.com/admin/quiz/${encodeURIComponent(quizId)}`,
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
        "x-component-type": "adminv3",
        "x-q-request-context-path": "QuizPage",
      },
      body: JSON.stringify({
        modifications: [
          {
            meta: {
              name: name
            }
          }
        ]
      }),
    });

    console.log(`[api:wayground:update-name] Response status: ${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log(`[api:wayground:update-name] Success - name updated for quiz ${quizId}`);
      return NextResponse.json(data, { status: res.status });
    } catch {
      console.log('[api:wayground:update-name] Response not JSON, returning as text');
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:update-name] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

