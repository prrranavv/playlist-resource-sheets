import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";

// Headers and cookies copied from provided curl for interactive videos
const CURL_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; _sid=EFRyx-ED5gWSoX_Gd7lrT5D4Qnf4WYIfDyfB--xeJd6gKGNRAqf19lekZSQUn0vqG4z3w6q2LA5SpmXjZZRXnoi80WxpgzdS1SQlecssHSpcNWTAN9l-L2Aj9lmWMEH8vK9Gk2cuxQpx1_wSw-QxOgmTLczl2jFlqEIy.vf4NI0P91_xSs5pO-FkZDQ.FP2rgJBJeQ2IXVHO; x-csrf-token=Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759900268910; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759851151443%7Cl%3A1759900268911; suid=23c655cc-2448-4b7c-a560-03b9e2b01bef; _csrf=-uuNzq9YcqdMBH_S4G5pXQN3rjY; x-csrf-token=-uuNzq9YcqdMBH_S4G5pXQN3rjY; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A57544bb1-b76f-16d0-869c-d2cdc8e5e5f2%7Ce%3A1759908338348%7Cc%3A1759900268910%7Cl%3A1759901138348; first_session=%7B%22visits%22%3A891%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759901144169%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759900753961%2C%22time_since_last_visit%22%3A390208%2C%22version%22%3A0.4%7D`;

export async function POST() {
  try {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("from", "0");
    url.searchParams.set("size", "100");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        baggage:
          "sentry-environment=production,sentry-release=9930e31d5c914e6eb7adbbca6908f09570c619d1,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=5fa79b34336e4d0286c1cebbe47c2aaa,sentry-sample_rate=0.05,sentry-transaction=admin-my-library-createdbyme,sentry-sampled=false",
        "content-type": "application/json",
        cookie: CURL_COOKIE,
        origin: "https://wayground.com",
        priority: "u=1, i",
        referer:
          "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22video-quiz%22]",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sentry-trace": "5fa79b34336e4d0286c1cebbe47c2aaa-8f97c1afd9400ad0-0",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "x-amzn-trace-id": "Root=1-68e5f5ed-9463deff4087ae2b2b4f10a6;Parent=b8264c8fc85b7938;Sampled=1",
        "x-q-traceid": "Root=1-68e5f5ed-9463deff4087ae2b2b4f10a6;Parent=b8264c8fc85b7938;Sampled=1",
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

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json({ raw: data }, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


