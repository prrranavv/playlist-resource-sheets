import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

// Creates sheets in YOUR account, users get a "Make a copy" link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playlistTitle, playlistId, videos, channelTitle } = body;

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

    // Template spreadsheet ID and destination folder
    const templateSpreadsheetId = '1wy8QCQhr6cAIoJdvvvAwmy6FF0_XIKvtBGtN1-QAE8A';
    const destinationFolderId = '1O9CvfnyfYEALZ_RuNnne9V2C5Wgx8gTT';
    
    // Copy the template spreadsheet
    console.log('[export-to-sheets-oauth] Copying template spreadsheet for user');
    
    const copyResponse = await drive.files.copy({
      fileId: templateSpreadsheetId,
      requestBody: {
        name: `${channelTitle || playlistTitle} - Wayground Videos, Quizzes & Worksheets!`,
        parents: [destinationFolderId], // Save to specific folder
      },
    });

    const spreadsheetId = copyResponse.data.id as string;
    console.log('[export-to-sheets-oauth] Copied template to new sheet:', spreadsheetId);

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

    // Insert data into columns G:Q
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });

    console.log('[export-to-sheets-oauth] Data inserted into columns G:Q');

    // Get the actual sheet ID from the spreadsheet
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheetInfo.data.sheets?.[0]?.properties?.sheetId || 0;
    const sheetProperties = spreadsheetInfo.data.sheets?.[0]?.properties;
    const totalRows = sheetProperties?.gridProperties?.rowCount || 1000;
    
    // Calculate number of rows to keep (header + data rows)
    const rowsToKeep = rows.length;
    const rowsToDelete = totalRows - rowsToKeep;
    
    // Prepare batch update requests
    const batchRequests: sheets_v4.Schema$Request[] = [
      // Rename the sheet tab to the playlist title
      {
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            title: playlistTitle,
          },
          fields: 'title',
        },
      },
      // Format the header row for columns G:Q (indices 6-16)
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 6, // Column G
            endColumnIndex: 17,  // Column Q (exclusive end)
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
            startIndex: 6,  // Column G
            endIndex: 17,   // Column Q (exclusive end)
          },
        },
      },
    ];
    
    // Delete unused rows if there are any
    if (rowsToDelete > 0) {
      batchRequests.push({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowsToKeep,
            endIndex: totalRows,
          },
        },
      });
    }
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: batchRequests,
      },
    });

    console.log('[export-to-sheets-oauth] Formatting applied and unused rows deleted');

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
      message: 'Sheet created successfully!',
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

