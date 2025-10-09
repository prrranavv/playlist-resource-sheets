import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";
const QUIZ_BASE = "https://wayground.com/quiz/";

// Use the interactive videos curl cookies and token
const HARDCODED_COOKIE = "";
const CSRF = "";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
}

export async function POST(request: Request) {
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = headerCsrf || CSRF || "Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ";
    // Step 1: paginate through drafts with activityTypes:["video-quiz"] and collect quiz ids + draft versions + createdAt
    const candidates = new Map<string, { draftVersion: string | null; createdAt?: string }>(); // quizId -> {draftVersion, createdAt}
    let from = 0;
    const size = 100;
    let pagesFetched = 0;
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
      if (!pageRes.ok || !pageRes.json) break;

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
        if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) && (type === "video-quiz")) {
          if (!candidates.has(id)) {
            candidates.set(id, { 
              draftVersion: typeof dV === "string" ? dV : null,
              createdAt: typeof createdAt === "string" ? createdAt : undefined
            });
          }
        }
        for (const v of Object.values(anyObj)) collect(v);
      };
      collect(pageRes.json);

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
      createdAt: data.createdAt
    }));
    
    return NextResponse.json({ interactive: interactive.slice(0, 100) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


