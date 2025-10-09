import { NextResponse } from "next/server";

const AUTH_ENDPOINT = "https://wayground.com/_authserver/public/public/v1/auth/login/local";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const res = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ username, password, requestId: "" }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new NextResponse(text, { status: res.status });
    }

    // Extract Set-Cookie headers
    const cookies = res.headers.getSetCookie();
    const cookieString = cookies.join("; ");
    
    // Extract CSRF token from cookies
    const csrfMatch = cookieString.match(/x-csrf-token=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;

    return NextResponse.json({
      success: data.success,
      data: data.data,
      cookies: cookieString,
      csrfToken,
    }, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

