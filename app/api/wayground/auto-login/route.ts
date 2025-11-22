import { NextResponse } from "next/server";

const AUTH_ENDPOINT = "https://wayground.com/_authserver/public/public/v1/auth/login/local";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: Request) {
  console.log('[api:wayground:auto-login] Auto-login request received');
  
  // Get credentials from environment variables
  const username = process.env.WAYGROUND_USERNAME;
  const password = process.env.WAYGROUND_PASSWORD;
  
  if (!username || !password) {
    console.log('[api:wayground:auto-login] Error: Missing environment variables');
    return NextResponse.json(
      { error: "Auto-login credentials not configured" }, 
      { status: 500 }
    );
  }

  try {
    console.log(`[api:wayground:auto-login] Authenticating with configured credentials`);
    const res = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ username, password, requestId: "" }),
    });

    console.log(`[api:wayground:auto-login] Auth response status: ${res.status}`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[api:wayground:auto-login] Failed to parse auth response as JSON');
      return new NextResponse(text, { status: res.status });
    }

    // Extract Set-Cookie headers and parse them properly
    const cookies = res.headers.getSetCookie();
    console.log(`[api:wayground:auto-login] Received ${cookies.length} cookies from auth server`);
    
    // Extract just the cookie name=value pairs (before the first semicolon)
    // Skip empty values (cookies being cleared) and duplicates (keep the last one)
    const cookieMap = new Map<string, string>();
    
    for (const cookie of cookies) {
      const nameValue = cookie.split(';')[0].trim();
      if (!nameValue) continue;
      
      const [name, value] = nameValue.split('=');
      if (!name || !value) continue;
      
      // Skip if it's being cleared (Max-Age=0 or empty value)
      if (cookie.includes('Max-Age=0') || value === '') continue;
      
      cookieMap.set(name, value);
    }
    
    const cookieString = Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    
    // Extract CSRF token from cookies
    const csrfMatch = cookieString.match(/x-csrf-token=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;

    if (data.success) {
      console.log(`[api:wayground:auto-login] Login successful, ${cookieMap.size} cookies parsed, CSRF: ${csrfToken ? 'present' : 'missing'}`);
    } else {
      console.log(`[api:wayground:auto-login] Login failed: ${data.error || 'Unknown reason'}`);
    }

    return NextResponse.json({
      success: data.success,
      data: data.data,
      cookies: cookieString,
      csrfToken,
    }, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:auto-login] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


