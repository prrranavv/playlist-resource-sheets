import { NextResponse } from "next/server";

const QUICK_EDIT_BASE = "https://wayground.com/_quizserver/main/v2/quiz";

// Hardcoded cookie/csrf from provided curl for quickEdit (public visibility)
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759851151444; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759851151443%7Cl%3A1759851151444; _sid=EFRyx-ED5gWSoX_Gd7lrT5D4Qnf4WYIfDyfB--xeJd6gKGNRAqf19lekZSQUn0vqG4z3w6q2LA5SpmXjZZRXnoi80WxpgzdS1SQlecssHSpcNWTAN9l-L2Aj9lmWMEH8vK9Gk2cuxQpx1_wSw-QxOgmTLczl2jFlqEIy.vf4NI0P91_xSs5pO-FkZDQ.FP2rgJBJeQ2IXVHO; x-csrf-token=fbAgNpIL-2EWbLiGdeOqbrkfqAkm9rvKRBvI; _csrf=D9cIt6TyWlby79j_ngnsV7mnbfU; x-csrf-token=D9cIt6TyWlby79j_ngnsV7mnbfU; first_session=%7B%22visits%22%3A868%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759856178086%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759856174150%2C%22time_since_last_visit%22%3A3936%2C%22version%22%3A0.4%7D; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3Aa7648dfc-1fa3-a353-7510-859b7bebaa22%7Ce%3A1759863396721%7Cc%3A1759851151443%7Cl%3A1759856196721; suid=2380e955-ca73-44a5-ac9b-e0111677a161`;
const CSRF = "D9cIt6TyWlby79j_ngnsV7mnbfU";

export async function POST(request: Request) {
  try {
    const { quizId } = await request.json();
    if (!quizId) {
      return NextResponse.json({ error: "quizId required" }, { status: 400 });
    }
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
        cookie: HARDCODED_COOKIE,
        "x-csrf-token": CSRF,
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}


