"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { Combobox } from "@/components/ui/combobox";

type PlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
  videoUrl: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [grade, setGrade] = useState<string>("6th Grade");
  const [subject, setSubject] = useState<string>("Science");
  const [_creatingId, setCreatingId] = useState<string | null>(null);
  const [quizKeyById, setQuizKeyById] = useState<Record<string, string>>({});
  const [_bulkCreating, setBulkCreating] = useState(false);
  const [_bulkProgress, setBulkProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [_fetchedQuizIds, setFetchedQuizIds] = useState<string[]>([]);
  const [_fetchingAssessments, setFetchingAssessments] = useState(false);
  const [quizMetaById, setQuizMetaById] = useState<Record<string, { title: string; quizGenKey?: string | null }>>({});
  const [draftVersionById, setDraftVersionById] = useState<Record<string, string | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [phase, setPhase] = useState<"idle"|"videos"|"creating"|"waiting"|"can_fetch"|"fetched"|"published">("idle");
  const [waitRemaining, setWaitRemaining] = useState<number>(0);
  // const [_publishedDone, setPublishedDone] = useState(false);
  const [_creatingInteractiveId, setCreatingInteractiveId] = useState<string | null>(null);
  const [_bulkCreatingInteractive, setBulkCreatingInteractive] = useState(false);
  const [_interactiveProgress, setInteractiveProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [interactiveCreatedById, setInteractiveCreatedById] = useState<Record<string, boolean>>({});
  const [interactiveInfoByVideoId, setInteractiveInfoByVideoId] = useState<Record<string, { quizId: string; draftVersion: string }>>({});
  const [interactiveMetaByVideoId, setInteractiveMetaByVideoId] = useState<Record<string, { quizId: string; draftVersion: string; title: string }>>({});
  // const [_fetchingInteractive, _setFetchingInteractive] = useState(false);
  const [_interactivePhase, setInteractivePhase] = useState<"idle"|"waiting"|"can_fetch">("idle");
  const [interactiveWaitRemaining, setInteractiveWaitRemaining] = useState<number>(0);
  const [publishingIVs, setPublishingIVs] = useState(false);
  const [publishIVProgress, setPublishIVProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [createFlowStatus, setCreateFlowStatus] = useState<
    | "idle"
    | "creatingA"
    | "waitingA"
    | "fetchingA"
    | "doneA"
    | "creatingIV"
    | "waitingIV"
    | "fetchingIV"
    | "doneIV"
  >("idle");
  const [assessmentMatchedCount, setAssessmentMatchedCount] = useState<number>(0);
  const [ivMatchedCount, setIvMatchedCount] = useState<number>(0);
  const [readyToPublish, setReadyToPublish] = useState(false);
  const [resourcesPublished, setResourcesPublished] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  // Subject options
  const subjectOptions = [
    { value: "Mathematics", label: "Mathematics" },
    { value: "Science", label: "Science" },
    { value: "English", label: "English" },
    { value: "World Languages", label: "World Languages" },
    { value: "Physics", label: "Physics" },
    { value: "Chemistry", label: "Chemistry" },
    { value: "Biology", label: "Biology" },
    { value: "Social Studies", label: "Social Studies" },
    { value: "Geography", label: "Geography" },
    { value: "History", label: "History" },
    { value: "Arts", label: "Arts" },
    { value: "Computers", label: "Computers" },
    { value: "Physical Ed", label: "Physical Ed" },
    { value: "Fun", label: "Fun" },
    { value: "Professional Development", label: "Professional Development" },
    { value: "Architecture", label: "Architecture" },
    { value: "Business", label: "Business" },
    { value: "Design", label: "Design" },
    { value: "Education", label: "Education" },
    { value: "Instructional Technology", label: "Instructional Technology" },
    { value: "Journalism", label: "Journalism" },
    { value: "Life Skills", label: "Life Skills" },
    { value: "Moral Science", label: "Moral Science" },
    { value: "Philosophy", label: "Philosophy" },
    { value: "Performing Arts", label: "Performing Arts" },
    { value: "Religious Studies", label: "Religious Studies" },
    { value: "Special Education", label: "Special Education" },
    { value: "Specialty", label: "Specialty" },
    { value: "Financial Education", label: "Financial Education" },
    { value: "Life Project", label: "Life Project" },
    { value: "Health Sciences", label: "Health Sciences" },
    { value: "Engineering", label: "Engineering" },
    { value: "Construction", label: "Construction" },
    { value: "Information Technology (IT)", label: "Information Technology (IT)" },
    { value: "Hospitality and Catering", label: "Hospitality and Catering" },
    { value: "Other", label: "Other" },
  ];

  // Grade options
  const gradeOptions = [
    { value: "Kindergarten", label: "Kindergarten" },
    { value: "Elementary (1st - 5th)", label: "Elementary (1st - 5th)" },
    { value: "1st Grade", label: "1st Grade" },
    { value: "2nd Grade", label: "2nd Grade" },
    { value: "3rd Grade", label: "3rd Grade" },
    { value: "4th Grade", label: "4th Grade" },
    { value: "5th Grade", label: "5th Grade" },
    { value: "Middle School (6th - 8th)", label: "Middle School (6th - 8th)" },
    { value: "6th Grade", label: "6th Grade" },
    { value: "7th Grade", label: "7th Grade" },
    { value: "8th Grade", label: "8th Grade" },
    { value: "High School (9th - 12th)", label: "High School (9th - 12th)" },
    { value: "9th Grade", label: "9th Grade" },
    { value: "10th Grade", label: "10th Grade" },
    { value: "11th Grade", label: "11th Grade" },
    { value: "12th Grade", label: "12th Grade" },
    { value: "University", label: "University" },
    { value: "Professional Development", label: "Professional Development" },
    { value: "Vocational training", label: "Vocational training" },
  ];

  // Auto-login on component mount to get fresh cookies
  useEffect(() => {
    console.log('[ui:mount] Component mounted, initiating auto-login');
    async function autoLogin() {
      try {
        console.log('[ui:auto-login] Starting auto-login');
        const res = await fetch("/api/wayground/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ 
            username: "margaret.1759843072426@qtility.com", 
            password: "9i9]KDCNb[" 
          }),
        });
        
        const data = await res.json();
        
        if (res.ok && data.success && data.cookies) {
          // Store cookies in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("waygroundCookie", data.cookies);
          }
          console.log("[ui:auto-login] Success - fresh cookies loaded");
        } else {
          console.error("[ui:auto-login] Failed:", data.error);
        }
      } catch (err) {
        console.error("[ui:auto-login] Error:", err);
      }
    }
    
    autoLogin();
  }, []); // Empty dependency array - runs once on mount

  function buildAssessmentPublishPairs(): Array<{ quizId: string; draftVersion: string }> {
    const pairs: Array<{ quizId: string; draftVersion: string }> = [];
    for (const it of items) {
      const vKey = quizKeyById[it.id];
      if (!vKey) continue;
      const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
      if (!entry) continue;
      const [qId] = entry;
      const dV = draftVersionById[qId];
      if (qId && dV) pairs.push({ quizId: qId, draftVersion: dV });
    }
    return pairs;
  }

  function pause(ms: number) { return new Promise<void>((res) => setTimeout(res, ms)); }

  function computeAssessmentMatchCount(): number {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    let matched = 0;
    for (const it of items) {
      const vKey = quizKeyById[it.id];
      let isMatch = false;
      if (vKey) {
        const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
        if (entry) isMatch = true;
      }
      if (!isMatch) {
        // Fallback: title match if quizGenKey not available yet
        const itNorm = normalize(it.title);
        for (const meta of Object.values(quizMetaById)) {
          if (meta?.title && normalize(meta.title) === itNorm) {
            isMatch = true;
            break;
          }
        }
      }
      if (isMatch) matched += 1;
    }
    return matched;
  }

  async function fetchInteractivesAndUpdate(): Promise<{ ivPairs: Array<{ quizId: string; draftVersion: string; videoId: string; title: string }> }> {
    console.log('[ui:fetchInteractives] Starting interactive video fetch');
    const res = await fetch("/api/wayground/fetch-interactive-map", { method: "POST", headers: cookieHeader() });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.interactive)) {
      const allIVs = data.interactive as Array<{ quizId: string; draftVersion?: string | null; createdAt?: string; title?: string }>;
      
      // Filter for IVs created in the last 5 minutes
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const recentIVs = allIVs.filter(iv => {
        if (!iv.createdAt) return false;
        const createdTime = new Date(iv.createdAt).getTime();
        return createdTime >= fiveMinutesAgo;
      });
      
      console.log(`[ui:fetchInteractives] Found ${allIVs.length} total IVs, ${recentIVs.length} created in last 5 minutes`);
      
      if (recentIVs.length > 0) {
        // Fetch video IDs and titles for recent IVs with exponential backoff
        const videoIdMap: Record<string, string> = {}; // quizId -> videoId
        const titleMap: Record<string, string> = {}; // quizId -> title (from fetch-interactive-map or fetch-iv-video-ids)
        let consecutiveRateLimits = 0;
        const baseDelay = 8000;
        
        for (let i = 0; i < recentIVs.length; i++) {
          const iv = recentIVs[i];
          // Use title from fetch-interactive-map as initial value
          if (iv.title) {
            titleMap[iv.quizId] = iv.title;
          }
          
          let retryCount = 0;
          let success = false;
          
          while (!success && retryCount < 3) {
            try {
              const res2 = await fetch("/api/wayground/fetch-iv-video-ids", {
                method: "POST",
                headers: { "content-type": "application/json", ...cookieHeader() },
                body: JSON.stringify({ quizIds: [iv.quizId] }),
              });
              const data2 = await res2.json();
              
              // Check if rate limited
              if (data2?.error?.includes?.("TOO_MANY_REQUESTS") || data2?.error?.includes?.("rateLimiter")) {
                consecutiveRateLimits++;
                const retryDelay = Math.min(30000, baseDelay * Math.pow(2, retryCount));
                console.log(`[ui:fetchInteractives] Rate limited on IV ${iv.quizId}, waiting ${retryDelay}ms before retry ${retryCount + 1}/3`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryCount++;
                continue;
              }
              
              if (res2.ok && data2?.videoIdsById) {
                const videoId = data2.videoIdsById[iv.quizId];
                const title = data2.titlesById?.[iv.quizId];
                if (videoId) {
                  videoIdMap[iv.quizId] = videoId;
                  console.log(`[ui:fetchInteractives] Mapped IV ${iv.quizId} to video ${videoId}`);
                }
                // Prefer title from fetch-iv-video-ids if available, otherwise keep the one from fetch-interactive-map
                if (title) {
                  titleMap[iv.quizId] = title;
                }
                consecutiveRateLimits = 0;
              }
              success = true;
            } catch (err) {
              console.error(`[ui:fetchInteractives] Failed to fetch video ID for IV ${iv.quizId}:`, err);
              retryCount++;
              if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
          
          // Adaptive delay
          let delay = baseDelay + (consecutiveRateLimits * 2000);
          delay = Math.min(delay, 30000);
          
          if (i < recentIVs.length - 1) {
            console.log(`[ui:fetchInteractives] Waiting ${delay}ms before next IV request (consecutive rate limits: ${consecutiveRateLimits})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        console.log(`[ui:fetchInteractives] Mapped ${Object.keys(videoIdMap).length} IVs to videos`);
        
        // Update state with fetched video IDs and titles
        const setMap: Record<string, boolean> = {};
        const infoMap: Record<string, { quizId: string; draftVersion: string }> = {};
        const metaMap: Record<string, { quizId: string; draftVersion: string; title: string }> = {};
        
        for (const [quizId, videoId] of Object.entries(videoIdMap)) {
          setMap[videoId] = true;
          const iv = recentIVs.find(i => i.quizId === quizId);
          const title = titleMap[quizId] || "";
          if (iv?.draftVersion) {
            infoMap[videoId] = { quizId, draftVersion: iv.draftVersion };
            metaMap[videoId] = { quizId, draftVersion: iv.draftVersion, title };
          }
        }
        
        setInteractiveCreatedById((prev) => ({ ...prev, ...setMap }));
        setInteractiveInfoByVideoId((prev) => ({ ...prev, ...infoMap }));
        setInteractiveMetaByVideoId((prev) => ({ ...prev, ...metaMap }));
        
        // Build IV pairs for publishing from the fetched data
        const ivPairs: Array<{ quizId: string; draftVersion: string; videoId: string; title: string }> = [];
        for (const [videoId, info] of Object.entries(infoMap)) {
          const metaInfo = metaMap[videoId];
          if (info.quizId && info.draftVersion && metaInfo?.title) {
            ivPairs.push({
              quizId: info.quizId,
              draftVersion: info.draftVersion,
              videoId: videoId,
              title: metaInfo.title
            });
          }
        }
        
        console.log(`[ui:fetchInteractives] Built ${ivPairs.length} IV pairs for publishing`);
        
        // Compute IV match count
        let matched = 0;
        for (const it of items) if (setMap[it.id]) matched += 1;
        console.log(`[ui:fetchInteractives] Matched ${matched}/${items.length} IVs to playlist videos`);
        setIvMatchedCount(matched);
        
        console.log('[ui:fetchInteractives] Complete');
        return { ivPairs };
      }
      
      console.log('[ui:fetchInteractives] No recent IVs found');
      return { ivPairs: [] };
    }
    console.log('[ui:fetchInteractives] API call failed');
    return { ivPairs: [] };
  }
  function cookieHeader(): Record<string, string> {
    const cookie = (typeof window !== "undefined") ? (localStorage.getItem("waygroundCookie") || "") : "";
    return cookie ? { "x-wayground-cookie": cookie } : {};
  }

  // function extractCookieFromText(text: string): string | null {
  //   if (!text) return null;
  //   // -b 'cookie-string' or --cookie "cookie-string"
  //   const m1 = text.match(/(?:\s|^)\-b\s+['\"]([^'\"\n]+)['\"]/i);
  //   if (m1?.[1]) return m1[1];
  //   const m2 = text.match(/(?:\s|^)\-\-cookie\s+['\"]([^'\"\n]+)['\"]/i);
  //   if (m2?.[1]) return m2[1];
  //   // -H 'cookie: ...' or -H "Cookie: ..."
  //   const m3 = text.match(/\-H\s+['\"][Cc]ookie:\s*([^'\"\n]+)['\"]/i);
  //   if (m3?.[1]) return m3[1];
  //   // Any standalone line starting with Cookie:
  //   const m4 = text.match(/^[Cc]ookie:\s*(.+)$/im);
  //   if (m4?.[1]) return m4[1].trim();
  //   return null;
  // }

  // function openAuthModal() {
  //   setAuthOpen(true);
  //   setAuthError(null);
  // }

  async function handleLogin() {
    if (!email || !password) {
      setAuthError("Email and password are required");
      return;
    }
    
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const res = await fetch("/api/wayground/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success && data.cookies) {
        // Store cookies in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("waygroundCookie", data.cookies);
        }
        setAuthOpen(false);
        setEmail("");
        setPassword("");
        setAuthError(null);
      } else {
        setAuthError(data.error || "Login failed. Please check your credentials.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }


  async function createResources() {
    if (items.length === 0) return;
    console.log(`[ui:createResources] Starting full resource creation flow for ${items.length} videos`);
    setReadyToPublish(false);
    setResourcesPublished(false);
    // initialize progress for both
    setBulkProgress({ done: 0, total: items.length });
    setInteractiveProgress({ done: 0, total: items.length });
    setError(null);

    console.log('[ui:createResources] Phase 1: Creating assessments');
    setCreateFlowStatus("creatingA");
    setBulkCreating(true);

    // Build a local map of videoId -> quizGenKey during creation
    const localQuizKeyById: Record<string, string> = { ...quizKeyById };

    const assessmentWorker = async (it: PlaylistItem) => {
      if (localQuizKeyById[it.id]) {
        console.log(`[ui:createResources] Skipping assessment for ${it.id} - already created`);
        return; // skip if already created
      }
      const key = await createAssessmentAndGetKey(it);
      if (key) {
        localQuizKeyById[it.id] = key;
        console.log(`[ui:createResources] Created assessment for ${it.id}, key: ${key}`);
      }
    };
    const assessmentInc = () => setBulkProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));

    // Create assessments sequentially
    for (const it of items) {
      await assessmentWorker(it);
      assessmentInc();
    }
    console.log(`[ui:createResources] All assessments created, ${Object.keys(localQuizKeyById).length} keys collected`);
    setBulkCreating(false);

    // Wait 100s after assessments
    console.log('[ui:createResources] Phase 2: Waiting 100s for assessment processing');
    setCreateFlowStatus("waitingA");
    startWaitCountdown(100);
    await pause(100_000);

    // Fetch assessments
    console.log('[ui:createResources] Phase 3: Fetching assessment metadata');
    setCreateFlowStatus("fetchingA");
    const assessmentData = await fetchAssessments();
    console.log(`[ui:createResources] Fetched ${Object.keys(assessmentData.quizMetaById).length} assessment metadata`);
    const aCount = computeAssessmentMatchCount();
    console.log(`[ui:createResources] Matched ${aCount}/${items.length} assessments`);
    setAssessmentMatchedCount(aCount);

    // Create IVs sequentially
    console.log('[ui:createResources] Phase 4: Creating interactive videos');
    setCreateFlowStatus("creatingIV");
    setBulkCreatingInteractive(true);
    for (const it of items) {
      if (!interactiveCreatedById[it.id]) {
        await createInteractive(it);
      } else {
        console.log(`[ui:createResources] Skipping IV for ${it.id} - already created`);
      }
      setInteractiveProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));
    }
    console.log('[ui:createResources] All interactive videos created');
    setBulkCreatingInteractive(false);

    // Wait 100s after IVs
    console.log('[ui:createResources] Phase 5: Waiting 100s for IV processing');
    setCreateFlowStatus("waitingIV");
    startInteractiveWaitCountdown(100);
    await pause(100_000);

    // Fetch IVs
    console.log('[ui:createResources] Phase 6: Fetching interactive video metadata');
    setCreateFlowStatus("fetchingIV");
    const ivData = await fetchInteractivesAndUpdate();
    setCreateFlowStatus("doneIV");
    setReadyToPublish(true);
    console.log('[ui:createResources] All resources created and fetched');

    // Wait for state updates to propagate
    await pause(3000);

    // Automatically publish resources using the exact original working flow
    console.log("[ui:createResources] Phase 7: Auto-publishing all resources");
    const assessmentPairs = buildAssessmentPublishPairsWithData(assessmentData.quizMetaById, assessmentData.draftVersionById);
    const ivPairs = ivData.ivPairs.map(iv => ({ quizId: iv.quizId, draftVersion: iv.draftVersion }));
    console.log(`[ui:createResources] Assessment pairs to publish: ${assessmentPairs.length}`);
    console.log(`[ui:createResources] IV pairs to publish: ${ivPairs.length}`);
    
    // Create a map from quizId to YouTube video title for both assessments and IVs
    const quizIdToYouTubeTitle: Record<string, string> = {};
    
    // Build a videoId -> YouTubeTitle map from the original playlist items
    const videoIdToTitle: Record<string, string> = {};
    for (const video of items) {
      videoIdToTitle[video.id] = video.title;
    }
    console.log(`[ui:createResources] Have ${Object.keys(videoIdToTitle).length} YouTube video titles`);
    
    // Map assessments: Match each assessment to its YouTube video
    // During creation, each assessment was associated with a video and got a unique quizGenKey
    // We need to match: quizId -> quizGenKey -> videoId -> YouTube title
    for (const video of items) {
      const videoId = video.id;
      const quizGenKey = localQuizKeyById[videoId];
      
      if (quizGenKey) {
        // Find the quizId that has this quizGenKey
        const quizEntry = Object.entries(assessmentData.quizMetaById).find(([, meta]) => meta.quizGenKey === quizGenKey);
        if (quizEntry) {
          const [quizId] = quizEntry;
          quizIdToYouTubeTitle[quizId] = video.title;
          console.log(`[ui:createResources] Mapped assessment ${quizId} (key: ${quizGenKey}) to YouTube: "${video.title.substring(0, 50)}..."`);
        } else {
          console.log(`[ui:createResources] No assessment found for video ${videoId} with key ${quizGenKey}`);
        }
      } else {
        console.log(`[ui:createResources] No quizGenKey found for video ${videoId} in localQuizKeyById`);
      }
    }
    
    // Map IVs: Find YouTube video title by matching videoId
    for (const iv of ivData.ivPairs) {
      const video = items.find(it => it.id === iv.videoId);
      if (video) {
        quizIdToYouTubeTitle[iv.quizId] = video.title;
        console.log(`[ui:createResources] Mapped IV ${iv.quizId} to YouTube title: "${video.title.substring(0, 50)}..."`);
      } else {
        console.log(`[ui:createResources] No video found for IV ${iv.quizId} (videoId: ${iv.videoId})`);
      }
    }
    
    console.log(`[ui:createResources] Mapped ${Object.keys(quizIdToYouTubeTitle).length} quiz IDs to YouTube titles`);
    
    setPublishing(true);
    setPublishProgress({ done: 0, total: assessmentPairs.length });
    for (const p of assessmentPairs) {
      try {
        console.log(`[ui:publish] Publishing assessment ${p.quizId} v${p.draftVersion}`);
        await fetch("/api/wayground/publish-quiz", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
        
        // Update name to match YouTube video title
        const videoTitle = quizIdToYouTubeTitle[p.quizId];
        if (videoTitle) {
          console.log(`[ui:publish] Updating assessment name: ${p.quizId} → "${videoTitle.substring(0, 50)}..."`);
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        } else {
          console.log(`[ui:publish] No YouTube title found for assessment ${p.quizId}`);
        }
        console.log(`[ui:publish] Assessment ${p.quizId} completed`);
      } catch (err) {
        console.error(`[ui:publish] Failed to publish assessment ${p.quizId}:`, err);
      }
      setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    console.log(`[ui:publish] All ${assessmentPairs.length} assessments published`);
    setPublishing(false);
    setPublishingIVs(true);
    setPublishIVProgress({ done: 0, total: ivPairs.length });
    for (const p of ivPairs) {
      try {
        console.log(`[ui:publish] Publishing IV ${p.quizId} v${p.draftVersion}`);
        await fetch("/api/wayground/publish-interactive", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
        
        // Update name to match YouTube video title
        const videoTitle = quizIdToYouTubeTitle[p.quizId];
        if (videoTitle) {
          console.log(`[ui:publish] Updating IV name: ${p.quizId} → "${videoTitle.substring(0, 50)}..."`);
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        } else {
          console.log(`[ui:publish] No YouTube title found for IV ${p.quizId}`);
        }
        console.log(`[ui:publish] IV ${p.quizId} completed`);
      } catch (err) {
        console.error(`[ui:publish] Failed to publish IV ${p.quizId}:`, err);
      }
      setPublishIVProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    console.log(`[ui:publish] All ${ivPairs.length} IVs published`);
    setPublishingIVs(false);
    setResourcesPublished(true);
    console.log("[ui:createResources] COMPLETE - All resources created and published!");
  }

  function buildAssessmentPublishPairsWithData(
    fetchedQuizMetaById: Record<string, { title: string; quizGenKey?: string | null }>,
    fetchedDraftVersionById: Record<string, string | null>
  ): Array<{ quizId: string; draftVersion: string }> {
    const pairs: Array<{ quizId: string; draftVersion: string }> = [];
    console.log("Building pairs with data:");
    console.log("- fetchedQuizMetaById keys:", Object.keys(fetchedQuizMetaById));
    console.log("- fetchedDraftVersionById keys:", Object.keys(fetchedDraftVersionById));
    
    // Match each quiz metadata with its draft version
    for (const [quizId, meta] of Object.entries(fetchedQuizMetaById)) {
      const dV = fetchedDraftVersionById[quizId];
      if (quizId && dV) {
        pairs.push({ quizId, draftVersion: dV });
        console.log(`Added pair: ${quizId} v${dV} (title: ${meta.title})`);
      } else {
        console.log(`Skipping ${quizId} - missing draft version`);
      }
    }
    return pairs;
  }

  function buildIvPublishPairs(): Array<{ quizId: string; draftVersion: string }> {
    const pairs: Array<{ quizId: string; draftVersion: string }> = [];
    for (const [videoId, info] of Object.entries(interactiveInfoByVideoId)) {
      if (!interactiveCreatedById[videoId]) continue;
      if (info?.quizId && info?.draftVersion) pairs.push({ quizId: info.quizId, draftVersion: info.draftVersion });
    }
    return pairs;
  }

  function findVideoTitleForAssessmentById(
    quizId: string,
    fetchedQuizMetaById: Record<string, { title: string; quizGenKey?: string | null }>
  ): string | null {
    // Get the title from the fetched metadata
    const meta = fetchedQuizMetaById[quizId];
    return meta?.title || null;
  }

  function findVideoTitleForAssessment(quizId: string): string | null {
    // Find the quizGenKey for this assessment
    const meta = quizMetaById[quizId];
    if (!meta?.quizGenKey) return null;
    
    // Find the video that has this quizGenKey
    const videoId = Object.entries(quizKeyById).find(([, key]) => key === meta.quizGenKey)?.[0];
    if (!videoId) return null;
    
    // Find the video title from items
    const video = items.find(item => item.id === videoId);
    return video?.title || null;
  }

  function findVideoTitleForIV(quizId: string): string | null {
    // Find the video ID that maps to this IV quizId
    const videoId = Object.entries(interactiveInfoByVideoId).find(([, info]) => info.quizId === quizId)?.[0];
    if (!videoId) return null;
    
    // Find the video title from items
    const video = items.find(item => item.id === videoId);
    return video?.title || null;
  }

  async function exportCsv() {
    console.log(`[ui:exportCsv] Exporting CSV for ${items.length} videos`);
    const rows: Array<string[]> = [];
    rows.push([
      "YouTube Playlist Name",
      "YouTube Playlist Link",
      "YouTube Video Title",
      "YouTube Video ID",
      "YouTube Video Link",
      "Wayground Assessment Title",
      "Wayground Assessment Link",
      "Wayground Assessment Quiz ID",
      "Wayground IV Title",
      "Wayground IV Link",
      "Wayground IV Quiz ID",
    ]);
    const playlistLink = playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : "";
    for (const it of items) {
      const vKey = quizKeyById[it.id];
      if (!vKey) continue;
      const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
      if (!entry) continue;
      const [qId] = entry as [string, { title: string }];
      const videoLink = `https://www.youtube.com/watch?v=${it.id}`;
      const assessmentLink = `https://wayground.com/admin/quiz/${qId}`;
      const ivMeta = interactiveMetaByVideoId[it.id];
      const ivLink = ivMeta?.quizId ? `https://wayground.com/admin/quiz/${ivMeta.quizId}` : "";
      const ivId = ivMeta?.quizId || "";
      
      // Use YouTube video title for both assessment and IV titles (matching the updated names on Wayground)
      const assessmentTitle = it.title;
      const ivTitle = it.title;
      
      rows.push([
        playlistTitle || "",
        playlistLink,
        it.title,
        it.id,
        videoLink,
        assessmentTitle,
        assessmentLink,
        qId,
        ivTitle,
        ivLink,
        ivId,
      ]);
    }
    const csv = rows.map(r => r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `${(playlistTitle || 'playlist').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'playlist'}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[ui:exportCsv] CSV exported: ${filename}`);
  }

  async function publishResources() {
    const assessmentPairs = buildAssessmentPublishPairs();
    const ivPairs = buildIvPublishPairs();
    console.log("Assessment pairs to publish:", assessmentPairs.length, assessmentPairs);
    console.log("IV pairs to publish:", ivPairs.length, ivPairs);
    setPublishing(true);
    setPublishProgress({ done: 0, total: assessmentPairs.length });
    for (const p of assessmentPairs) {
      try {
        await fetch("/api/wayground/publish-quiz", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
        
        // Update name to match YouTube video title
        const videoTitle = findVideoTitleForAssessment(p.quizId);
        if (videoTitle) {
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        }
      } catch {}
      setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    setPublishing(false);
    setPublishingIVs(true);
    setPublishIVProgress({ done: 0, total: ivPairs.length });
    for (const p of ivPairs) {
      try {
        await fetch("/api/wayground/publish-interactive", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
        
        // Update name to match YouTube video title
        const videoTitle = findVideoTitleForIV(p.quizId);
        if (videoTitle) {
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        }
      } catch {}
      setPublishIVProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    setPublishingIVs(false);
    setResourcesPublished(true);
  }

  function showOutputLinks() {
    // Just show output links in the video table
    setShowOutput(true);
  }
  // Unused for now - kept for future bulk publish feature
  // async function publishAssessmentsAll() {
  //   const pairs = buildAssessmentPublishPairs();
  //   if (pairs.length === 0) return;
  //   setPublishing(true);
  //   setPublishProgress({ done: 0, total: pairs.length });
  //   for (const p of pairs) {
  //     try {
  //       await fetch("/api/wayground/publish-quiz", {
  //         method: "POST",
  //         headers: { "content-type": "application/json" },
  //         body: JSON.stringify(p),
  //       });
  //       await fetch("/api/wayground/make-public", {
  //         method: "POST",
  //         headers: { "content-type": "application/json" },
  //         body: JSON.stringify({ quizId: p.quizId }),
  //       });
  //     } catch {}
  //     setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
  //   }
  //   setPublishing(false);
  //   setPhase("published");
  //   setPublishedDone(true);
  // }

  function startInteractiveWaitCountdown(seconds: number = 60) {
    // Always restart to ensure countdown is from the last request
    setInteractivePhase("waiting");
    setInteractiveWaitRemaining(seconds);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(seconds - elapsed, 0);
      setInteractiveWaitRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setInteractivePhase("can_fetch");
      }
    }, 1000);
  }

  async function fetchPlaylist() {
    console.log(`[ui:fetchPlaylist] Fetching playlist: ${input.substring(0, 100)}`);
    setError(null);
    setItems([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch playlist");
      }
      console.log(`[ui:fetchPlaylist] Success: ${data.items.length} videos, playlist="${data.playlistTitle}"`);
      setPlaylistId(data.playlistId as string);
      setPlaylistTitle((data.playlistTitle as string) || null);
      setChannelTitle((data.channelTitle as string) || null);
      setItems((data.items as PlaylistItem[]).sort((a, b) => a.position - b.position));
      setPhase("videos");
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Something went wrong";
      console.error(`[ui:fetchPlaylist] Error: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function findQuizGenKey(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === "quizGenKey" && typeof v === "string") return v;
        const nested = findQuizGenKey(v);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  function startWaitCountdown(seconds: number = 90) {
    if (phase === "waiting" || phase === "can_fetch" || phase === "fetched" || phase === "published") return;
    setPhase("waiting");
    setWaitRemaining(seconds);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(seconds - elapsed, 0);
      setWaitRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setPhase("can_fetch");
      }
    }, 1000);
  }

  async function createAssessment(item: PlaylistItem, startWait: boolean = true): Promise<boolean> {
    console.log(`[ui:createAssessment] Creating assessment for video ${item.id}: "${item.title.substring(0, 50)}..."`);
    setCreatingId(item.id);
    if (phase === "videos") setPhase("creating");
    try {
      const res = await fetch("/api/wayground/create-assessment", {
        method: "POST",
        headers: { "content-type": "application/json", ...cookieHeader() },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          grade,
          subject,
          duration: 0,
          videoId: item.id,
        }),
      });
      const cloned = res.clone();
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await cloned.text();
      }
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }
      const key = findQuizGenKey(data);
      if (key) {
        console.log(`[ui:createAssessment] Success for ${item.id}, quizGenKey: ${key}`);
        setQuizKeyById((prev) => ({ ...prev, [item.id]: key }));
      } else {
        console.log(`[ui:createAssessment] Success for ${item.id}, but no quizGenKey found`);
      }
      if (startWait) startWaitCountdown(90);
      return true;
    } catch (e: unknown) {
      console.error(`[ui:createAssessment] Error for ${item.id}:`, e);
      setError("Failed to create assessment. See console for details.");
      return false;
    } finally {
      setCreatingId(null);
    }
  }

  async function createAssessmentAndGetKey(item: PlaylistItem): Promise<string | null> {
    console.log(`[ui:createAssessment] Creating assessment for video ${item.id}: "${item.title.substring(0, 50)}..."`);
    setCreatingId(item.id);
    if (phase === "videos") setPhase("creating");
    try {
      const res = await fetch("/api/wayground/create-assessment", {
        method: "POST",
        headers: { "content-type": "application/json", ...cookieHeader() },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          grade,
          subject,
          duration: 0,
          videoId: item.id,
        }),
      });
      const cloned = res.clone();
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await cloned.text();
      }
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }
      const key = findQuizGenKey(data);
      if (key) {
        console.log(`[ui:createAssessment] Success for ${item.id}, quizGenKey: ${key}`);
        setQuizKeyById((prev) => ({ ...prev, [item.id]: key }));
        return key;
      } else {
        console.log(`[ui:createAssessment] Success for ${item.id}, but no quizGenKey found`);
        return null;
      }
    } catch (e: unknown) {
      console.error(`[ui:createAssessment] Error for ${item.id}:`, e);
      setError("Failed to create assessment. See console for details.");
      return null;
    } finally {
      setCreatingId(null);
    }
  }

  // Unused for now - kept for future bulk create feature
  // async function createAssessmentsBulk() {
  //   if (items.length === 0) return;
  //   setBulkCreating(true);
  //   setBulkProgress({ done: 0, total: items.length });
  //   setError(null);
  //   setPhase("creating");
  //   for (const item of items) {
  //     if (quizKeyById[item.id]) {
  //       setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
  //       continue;
  //     }
  //     await createAssessment(item, false);
  //     setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
  //   }
  //   setBulkCreating(false);
  //   startWaitCountdown(90);
  // }

  async function createInteractive(item: PlaylistItem): Promise<boolean> {
    console.log(`[ui:createInteractive] Creating interactive video for ${item.id}: "${item.title.substring(0, 50)}..."`);
    setCreatingInteractiveId(item.id);
    try {
      const res = await fetch("/api/wayground/create-interactive", {
        method: "POST",
        headers: { "content-type": "application/json", ...cookieHeader() },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          grade,
          subject,
          videoId: item.id,
          duration: 0,
        }),
      });
      const cloned = res.clone();
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await cloned.text();
      }
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }
      console.log(`[ui:createInteractive] Success for ${item.id}`);
      return true;
    } catch (e: unknown) {
      console.error(`[ui:createInteractive] Error for ${item.id}:`, e);
      setError("Failed to create interactive video. See console for details.");
      return false;
    } finally {
      setCreatingInteractiveId(null);
    }
  }

  // Unused for now - kept for future bulk create feature
  // async function createInteractivesBulk() {
  //   if (items.length === 0) return;
  //   setBulkCreatingInteractive(true);
  //   setInteractiveProgress({ done: 0, total: items.length });
  //   setError(null);
  //   for (const item of items) {
  //     if (interactiveCreatedById[item.id]) {
  //       setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
  //       continue;
  //     }
  //     await createInteractive(item);
  //     setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
  //   }
  //   setBulkCreatingInteractive(false);
  //   // Ensure 90s wait after the last create in bulk
  //   startInteractiveWaitCountdown(90);
  // }

  async function fetchAssessments(): Promise<{ quizMetaById: Record<string, { title: string; quizGenKey?: string | null }>, draftVersionById: Record<string, string | null> }> {
    console.log('[ui:fetchAssessments] Starting assessment fetch');
    setFetchingAssessments(true);
    setError(null);
    try {
      const res = await fetch("/api/wayground/fetch-assessments", { method: "POST", headers: cookieHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch assessments");
      const ids = Array.isArray(data?.quizIds) ? (data.quizIds as string[]) : [];
      setFetchedQuizIds(ids);
      const quizTitleMap: Record<string, { title: string }> = {};
      if (Array.isArray(data?.quizzes)) {
        for (const q of data.quizzes as Array<{ id: string; title: string; createdAt?: string }>) {
          if (q?.id) quizTitleMap[q.id] = { title: q.title };
        }
      }
      setQuizMetaById((prev) => ({ ...prev, ...quizTitleMap }));

      // Filter for quizzes created in the last 5 minutes
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const recentQuizzes = Array.isArray(data?.quizzes) 
        ? (data.quizzes as Array<{ id: string; title: string; createdAt?: string }>)
            .filter(q => {
              if (!q.createdAt) return false;
              const createdTime = new Date(q.createdAt).getTime();
              return createdTime >= fiveMinutesAgo;
            })
        : [];
      
      const recentIds = recentQuizzes.map(q => q.id);
      console.log(`[ui:fetchAssessments] Found ${ids.length} total assessments, ${recentIds.length} created in last 5 minutes`);

      if (recentIds.length > 0) {
        // Process one ID at a time with exponential backoff to avoid rate limiting
        const allKeys: Record<string, string | null> = {};
        const allVersions: Record<string, string | null> = {};
        let consecutiveRateLimits = 0;
        const baseDelay = 8000; // Start with 8 seconds
        
        for (let i = 0; i < recentIds.length; i++) {
          const quizId = recentIds[i];
          let retryCount = 0;
          let success = false;
          
          while (!success && retryCount < 3) {
            try {
              const res2 = await fetch("/api/wayground/fetch-quiz-keys", {
                method: "POST",
                headers: { "content-type": "application/json", ...cookieHeader() },
                body: JSON.stringify({ quizIds: [quizId] }),
              });
              const data2 = await res2.json();
              
              // Check if rate limited
              if (data2?.error?.includes?.("TOO_MANY_REQUESTS") || data2?.error?.includes?.("rateLimiter")) {
                consecutiveRateLimits++;
                const retryDelay = Math.min(30000, baseDelay * Math.pow(2, retryCount)); // Max 30s
                console.log(`[ui:fetchAssessments] Rate limited on ${quizId}, waiting ${retryDelay}ms before retry ${retryCount + 1}/3`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryCount++;
                continue;
              }
              
              if (res2.ok && data2?.quizGenKeysById) {
                Object.assign(allKeys, data2.quizGenKeysById);
                if (data2?.draftVersionById) Object.assign(allVersions, data2.draftVersionById);
                consecutiveRateLimits = 0; // Reset on success
                console.log(`[ui:fetchAssessments] Fetched keys for ${quizId}`);
              }
              success = true;
            } catch (err) {
              console.error(`[ui:fetchAssessments] Failed to fetch quiz key for ${quizId}:`, err);
              retryCount++;
              if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
          
          // Adaptive delay: increase if we're getting rate limited
          let delay = baseDelay + (consecutiveRateLimits * 2000); // Add 2s per rate limit
          delay = Math.min(delay, 30000); // Cap at 30 seconds
          
          // Wait before next request (except for last one)
          if (i < recentIds.length - 1) {
            console.log(`[ui:fetchAssessments] Waiting ${delay}ms before next request (consecutive rate limits: ${consecutiveRateLimits})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        console.log(`[ui:fetchAssessments] Fetched ${Object.keys(allKeys).length} quiz keys and ${Object.keys(allVersions).length} draft versions`);
        
        // Update state with all collected keys
        const keyed: Record<string, { title: string; quizGenKey?: string | null }> = {};
        for (const [id, key] of Object.entries<string | null>(allKeys)) {
          const existing = quizTitleMap[id] || {};
          keyed[id] = { title: existing.title || "", quizGenKey: key };
        }
        setQuizMetaById((prev) => {
          const updated = { ...prev, ...keyed };
          // Update assessment match count after state is set
          setTimeout(() => {
            const count = computeAssessmentMatchCount();
            setAssessmentMatchedCount(count);
          }, 0);
          return updated;
        });
        if (Object.keys(allVersions).length > 0) setDraftVersionById(allVersions);
        
        setPhase("fetched");
        setFetchingAssessments(false);
        console.log(`[ui:fetchAssessments] Complete - returning ${Object.keys(keyed).length} metadata records`);
        
        // Return the fetched data directly
        return { quizMetaById: keyed, draftVersionById: allVersions };
      } else {
        console.log('[ui:fetchAssessments] No recent quizzes found');
        // Even if no recent quizzes, update the count
        setTimeout(() => {
          const count = computeAssessmentMatchCount();
          setAssessmentMatchedCount(count);
        }, 0);
        
        setPhase("fetched");
        setFetchingAssessments(false);
        return { quizMetaById: {}, draftVersionById: {} };
      }
    } catch (e: unknown) {
      console.error('[ui:fetchAssessments] Error:', e);
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Failed to fetch assessments";
      setError(msg);
      setFetchingAssessments(false);
      return { quizMetaById: {}, draftVersionById: {} };
    }
  }

  return (
    <div className="min-h-screen font-sans p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image 
                  src="/youtube.png" 
                  alt="YouTube" 
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
                <h2 className="text-xl font-semibold leading-none">Create Wayground resources from YouTube playlists!</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
                How to use
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Paste YouTube playlist URL or ID"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button onClick={fetchPlaylist} disabled={!input || loading}>
                {loading ? "Loading..." : "Show Videos"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}
            {/* Removed playlist ID display */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Subject</span>
                <Combobox
                  options={subjectOptions}
                  value={subject}
                  onValueChange={setSubject}
                  placeholder="Select subject"
                  searchPlaceholder="Search subjects..."
                  className="w-[280px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Grade</span>
                <Combobox
                  options={gradeOptions}
                  value={grade}
                  onValueChange={setGrade}
                  placeholder="Select grade"
                  searchPlaceholder="Search grades..."
                  className="w-[160px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Button size="sm" variant="default" onClick={createResources} disabled={items.length === 0 || !(createFlowStatus === "idle" || createFlowStatus === "doneIV") || publishing || publishingIVs }>
                {publishing || publishingIVs ? `Publishing… (${publishProgress.done + publishIVProgress.done}/${publishProgress.total + publishIVProgress.total})` :
                 createFlowStatus === "creatingA" || createFlowStatus === "creatingIV" ? "Creating resources…" :
                 createFlowStatus === "waitingA" || createFlowStatus === "waitingIV" ? `Waiting ${Math.max(waitRemaining, interactiveWaitRemaining)}s` :
                 createFlowStatus === "fetchingA" || createFlowStatus === "fetchingIV" ? "Fetching resources…" :
                 "Create resources"}
              </Button>
              <Button size="sm" variant="outline" onClick={showOutputLinks} disabled={!resourcesPublished}>
                Show output
              </Button>
            </div>
            
            {/* Removed per request: do not show repeated assessments created text here */}
          </CardContent>
        </Card>

        {authOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-md bg-white p-6 space-y-4">
              <h3 className="text-lg font-semibold">Login to Wayground</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={authLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={authLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !authLoading) {
                        handleLogin();
                      }
                    }}
                  />
                </div>
                {authError && (
                  <p className="text-sm text-red-600">{authError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAuthOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleLogin} disabled={authLoading}>
                  {authLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {helpOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-lg bg-white p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xl font-semibold">How to use</h3>
                <button 
                  onClick={() => setHelpOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">1.</span>
                  <div>
                    <div className="font-medium mb-1">Paste YouTube playlist URL or ID</div>
                    <div className="text-sm text-gray-600">
                      Example: <code className="bg-gray-50 px-1.5 py-0.5 rounded text-xs">PLSQl0a2vh4HCKeX3g-Mj5wXS0nfDeDSGS</code>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">2.</span>
                  <div>
                    <div className="font-medium">Click &ldquo;Show Videos&rdquo; to load the playlist</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">3.</span>
                  <div>
                    <div className="font-medium">Select Subject and Grade</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">4.</span>
                  <div>
                    <div className="font-medium mb-1">Click &ldquo;Create resources&rdquo;</div>
                    <div className="text-sm text-gray-600">Takes ~4-5 minutes. <span className="text-red-600 font-semibold">Do not close or refresh the tab.</span></div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">5.</span>
                  <div>
                    <div className="font-medium">Verify Assessments and Interactive Videos are created</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">6.</span>
                  <div>
                    <div className="font-medium">Click &ldquo;Publish resources & Export Sheet&rdquo;</div>
                  </div>
                </li>
              </ol>
              <div className="flex items-center justify-between pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://slack.com/app_redirect?channel=U06PZF56D5Z', '_blank')}
                >
                  Need help? Contact on Slack
                </Button>
                <Button onClick={() => setHelpOpen(false)}>
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              {(playlistTitle || channelTitle) && (
                <p className="text-sm text-muted-foreground">
                  Playlist: {playlistTitle || "-"} ⋅ Channel: {channelTitle || "-"}
                </p>
              )}
              {resourcesPublished && (
                <Button size="sm" variant="default" onClick={exportCsv}>
                  Export CSV
                </Button>
              )}
            </div>
            <div className="rounded-md border divide-y">
              {items.map((item) => {
                const videoKey = quizKeyById[item.id];
                const matchedId = videoKey ? Object.entries(quizMetaById).find(([, meta]) => meta.quizGenKey === videoKey)?.[0] : undefined;
                // const _matched = matchedId ? quizMetaById[matchedId] : undefined;
                const ivMeta = interactiveMetaByVideoId[item.id];
                const assessmentLink = matchedId ? `https://wayground.com/admin/quiz/${matchedId}` : "";
                const ivLink = ivMeta?.quizId ? `https://wayground.com/admin/interactive-video/${ivMeta.quizId}` : "";
                
                return (
                  <div key={item.id} className="p-2 hover:bg-muted">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground w-6 shrink-0">{item.position + 1}.</span>
                        <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 flex-1">
                          {item.thumbnailUrl ? (
                            <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                              <Image src={item.thumbnailUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {!showOutput && interactiveCreatedById[item.id] && (
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <span>Interactive video created!</span>
                                <span>✓</span>
                              </div>
                            )}
                            {!showOutput && (() => {
                              const matchedId = quizKeyById[item.id] ? Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === quizKeyById[item.id])?.[0] : undefined;
                              if (!matchedId) return null;
                              return (
                                <div className="flex items-center gap-2 text-xs text-green-600">
                                  <span>Assessment created</span>
                                  <span>✓</span>
                                </div>
                              );
                            })()}
                          </div>
                        </a>
                      </div>
                      {showOutput && (assessmentLink || ivLink) && (
                        <div className="flex items-center gap-2 shrink-0">
                          {assessmentLink && (
                            <a 
                              href={assessmentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Assessment"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Assessment.png" 
                                alt="Assessment" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Assessment
                              </span>
                            </a>
                          )}
                          {ivLink && (
                            <a 
                              href={ivLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Interactive Video"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Video.png" 
                                alt="Interactive Video" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Interactive Video
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
