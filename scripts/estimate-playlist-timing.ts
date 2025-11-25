/**
 * Estimates end-to-end playlist generation time for different playlist sizes
 * 
 * Based on the flow in app/page.tsx createResources():
 * 
 * Phase 1: Create assessments sequentially (no delays between calls)
 * Phase 2: Create interactive videos sequentially (no delays between calls)
 * Phase 3: Wait 150s for processing
 * Phase 4: Fetch quiz keys from database (single API call)
 * Phase 5: Fetch filtered assessments (single API call)
 * Phase 6: Fetch filtered interactive videos (single API call)
 * Phase 7: Fetch quiz gen keys and video IDs (2s gaps, skip if cached)
 * Phase 8: Publish all resources (3 API calls per resource: publish, make-public, update-name)
 * Phase 9: Save to Supabase (single API call)
 * Phase 10: Export to Google Sheets (single API call)
 */

interface TimingBreakdown {
  phase: string;
  time: number;
  description: string;
}

function estimatePlaylistGenerationTime(numVideos: number): {
  total: number;
  breakdown: TimingBreakdown[];
} {
  const breakdown: TimingBreakdown[] = [];
  let total = 0;

  // Phase 1: Create assessments sequentially
  // Each API call takes ~2-3 seconds (network + Wayground processing)
  // No explicit delays between calls
  const assessmentCreationTime = numVideos * 2.5;
  breakdown.push({
    phase: "Phase 1: Create Assessments",
    time: assessmentCreationTime,
    description: `${numVideos} videos × 2.5s per assessment API call`
  });
  total += assessmentCreationTime;

  // Phase 2: Create interactive videos sequentially
  // Each API call takes ~2-3 seconds (network + Wayground processing)
  // No explicit delays between calls
  const ivCreationTime = numVideos * 2.5;
  breakdown.push({
    phase: "Phase 2: Create Interactive Videos",
    time: ivCreationTime,
    description: `${numVideos} videos × 2.5s per IV API call`
  });
  total += ivCreationTime;

  // Phase 3: Wait for processing
  // Fixed 150 second wait
  const waitTime = 150;
  breakdown.push({
    phase: "Phase 3: Wait for Processing",
    time: waitTime,
    description: "Fixed 150s wait for resource processing"
  });
  total += waitTime;

  // Phase 4: Fetch quiz keys from database
  // Single API call
  const fetchQuizKeysTime = 1;
  breakdown.push({
    phase: "Phase 4: Fetch Quiz Keys from DB",
    time: fetchQuizKeysTime,
    description: "Single API call to database"
  });
  total += fetchQuizKeysTime;

  // Phase 5: Fetch filtered assessments
  // Single API call
  const fetchAssessmentsTime = 1;
  breakdown.push({
    phase: "Phase 5: Fetch Filtered Assessments",
    time: fetchAssessmentsTime,
    description: "Single API call to fetch assessments"
  });
  total += fetchAssessmentsTime;

  // Phase 6: Fetch filtered interactive videos
  // Single API call
  const fetchIVsTime = 1;
  breakdown.push({
    phase: "Phase 6: Fetch Filtered Interactive Videos",
    time: fetchIVsTime,
    description: "Single API call to fetch IVs"
  });
  total += fetchIVsTime;

  // Phase 7: Fetch quiz gen keys and video IDs
  // For each assessment: fetch quiz key (2s gap if not cached)
  // For each IV: fetch video ID (2s gap if not cached)
  // Assuming worst case (no cache): N assessments + N IVs = 2N calls with 2s gaps
  // But realistically, some might be cached, so average ~1.5s per call
  const fetchKeysTime = numVideos * 2 * 1.5; // 2 resources per video (assessment + IV), 1.5s average
  breakdown.push({
    phase: "Phase 7: Fetch Quiz Keys & Video IDs",
    time: fetchKeysTime,
    description: `${numVideos * 2} resources × 1.5s average (2s gap, some cached)`
  });
  total += fetchKeysTime;

  // Phase 8: Publish resources
  // For each assessment: 3 API calls (publish-quiz, make-public, update-name)
  // For each IV: 3 API calls (publish-interactive, make-public, update-name)
  // No explicit delays mentioned, estimate ~1s per API call
  const publishTime = numVideos * 2 * 3 * 1; // 2 resources per video, 3 calls each, 1s per call
  breakdown.push({
    phase: "Phase 8: Publish Resources",
    time: publishTime,
    description: `${numVideos * 2} resources × 3 API calls × 1s per call`
  });
  total += publishTime;

  // Phase 9: Save to Supabase
  // Single API call
  const saveSupabaseTime = 1;
  breakdown.push({
    phase: "Phase 9: Save to Supabase",
    time: saveSupabaseTime,
    description: "Single API call to save playlist"
  });
  total += saveSupabaseTime;

  // Phase 10: Export to Google Sheets
  // Single API call (happens during saveToSupabase)
  const exportSheetsTime = 1;
  breakdown.push({
    phase: "Phase 10: Export to Google Sheets",
    time: exportSheetsTime,
    description: "Single API call to export (included in saveToSupabase)"
  });
  total += exportSheetsTime;

  return { total, breakdown };
}

// Estimate for different playlist sizes
const playlistSizes = [10, 20, 30, 50, 100, 200];

console.log("=".repeat(80));
console.log("PLAYLIST GENERATION TIME ESTIMATES");
console.log("=".repeat(80));
console.log();

for (const size of playlistSizes) {
  const { total, breakdown } = estimatePlaylistGenerationTime(size);
  
  console.log(`📹 Playlist Size: ${size} videos`);
  console.log("-".repeat(80));
  console.log(`Total Estimated Time: ${total.toFixed(1)}s (${(total / 60).toFixed(1)} minutes)`);
  console.log();
  console.log("Breakdown:");
  
  breakdown.forEach(({ phase, time, description }) => {
    const percentage = ((time / total) * 100).toFixed(1);
    console.log(`  ${phase.padEnd(45)} ${time.toFixed(1)}s (${percentage.padStart(5)}%) - ${description}`);
  });
  
  console.log();
  console.log("=".repeat(80));
  console.log();
}

// Summary table
console.log("SUMMARY TABLE");
console.log("=".repeat(80));
console.log("Videos | Total Time (s) | Total Time (min)");
console.log("-".repeat(80));
playlistSizes.forEach(size => {
  const { total } = estimatePlaylistGenerationTime(size);
  console.log(`${size.toString().padStart(6)} | ${total.toFixed(1).padStart(13)} | ${(total / 60).toFixed(1).padStart(14)}`);
});
console.log("=".repeat(80));


