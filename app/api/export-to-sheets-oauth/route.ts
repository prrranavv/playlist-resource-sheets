import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

// Creates sheets in YOUR account, users get a "Make a copy" link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistTitle, playlistId, videos } = body;

    if (!playlistTitle || !videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { error: 'Missing required fields: playlistTitle and videos are required' },
        { status: 400 }
      );
    }

    // Use YOUR OAuth tokens from environment variables
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Server not configured. Missing GOOGLE_ACCESS_TOKEN or GOOGLE_REFRESH_TOKEN in environment variables.' },
        { status: 500 }
      );
    }

    // Create OAuth2 client with YOUR tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create a new spreadsheet in user's Drive
    console.log('[export-to-sheets-oauth] Creating spreadsheet for user');
    
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `${playlistTitle} - Wayground Resources`,
        },
        sheets: [
          {
            properties: {
              title: 'Playlist Resources',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId as string;
    console.log('[export-to-sheets-oauth] Created sheet:', spreadsheetId);

    // Prepare data rows
    const rows: Array<string[]> = [];
    rows.push([
      'YouTube Playlist Name',
      'YouTube Playlist Link',
      'YouTube Video Title',
      'YouTube Video ID',
      'YouTube Video Link',
      'Wayground Assessment Title',
      'Wayground Assessment Link',
      'Wayground Assessment Quiz ID',
      'Wayground IV Title',
      'Wayground IV Link',
      'Wayground IV Quiz ID',
    ]);

    const playlistLink = playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : '';

    for (const video of videos) {
      const videoLink = `https://www.youtube.com/watch?v=${video.youtube_video_id}`;
      const assessmentLink = video.assessment_link || '';
      const assessmentQuizId = video.assessment_quiz_id || '';
      const ivLink = video.interactive_video_link || '';
      const ivQuizId = video.interactive_video_quiz_id || '';

      rows.push([
        playlistTitle,
        playlistLink,
        video.title,
        video.youtube_video_id,
        videoLink,
        video.title,
        assessmentLink,
        assessmentQuizId,
        video.title,
        ivLink,
        ivQuizId,
      ]);
    }

    // Insert data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });

    console.log('[export-to-sheets-oauth] Data inserted');

    // Get the actual sheet ID from the created spreadsheet
    const sheetId = createResponse.data.sheets?.[0]?.properties?.sheetId || 0;
    
    // Format the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.6,
                    blue: 0.86,
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1,
                    },
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 11,
              },
            },
          },
        ],
      },
    });

    console.log('[export-to-sheets-oauth] Formatting applied');

    // Make the sheet publicly viewable (optional)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log('[export-to-sheets-oauth] Sheet made public');
    } catch {
      console.log('[export-to-sheets-oauth] Could not make public (user may not allow it)');
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const copyUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy`;

    // Save the Google Sheet URL to Supabase
    if (playlistId) {
      try {
        console.log('[export-to-sheets-oauth] Saving sheet URL to Supabase for YouTube playlist ID:', playlistId);
        const { error: updateError } = await supabaseAdmin
          .from('playlists')
          .update({ google_sheet_url: sheetUrl })
          .eq('youtube_playlist_id', playlistId);

        if (updateError) {
          console.error('[export-to-sheets-oauth] Error updating playlist:', updateError);
        } else {
          console.log('[export-to-sheets-oauth] Successfully saved sheet URL to database');
        }
      } catch (dbError) {
        console.error('[export-to-sheets-oauth] Database error:', dbError);
        // Don't fail the whole request if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      url: sheetUrl,
      copyUrl, // Special URL that prompts user to make a copy
      message: 'Sheet created! Click the copy link to save it to your Drive.',
    });

  } catch (error) {
    console.error('Error in export-to-sheets-oauth:', error);
    
    // Check if it's an auth error (tokens expired/invalid)
    if (error instanceof Error && (
      error.message.includes('invalid_grant') || 
      error.message.includes('invalid_token')
    )) {
      return NextResponse.json(
        { 
          error: 'Google authentication expired. Admin needs to refresh tokens. Check server logs.',
          details: 'GOOGLE_ACCESS_TOKEN or GOOGLE_REFRESH_TOKEN is invalid or expired'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to export to Google Sheets', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

