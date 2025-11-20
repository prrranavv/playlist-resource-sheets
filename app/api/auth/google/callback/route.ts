import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// OAuth 2.0 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'Authorization denied', details: error },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    );
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Display tokens to user so they can add them to .env.local
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #059669;
              margin-bottom: 20px;
            }
            .token-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 15px;
              margin: 15px 0;
              overflow-x: auto;
            }
            .token-label {
              font-weight: 600;
              color: #374151;
              margin-bottom: 5px;
            }
            .token-value {
              font-family: monospace;
              font-size: 12px;
              color: #1f2937;
              word-break: break-all;
            }
            .instructions {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 20px 0;
            }
            .instructions ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .instructions li {
              margin: 8px 0;
            }
            button {
              background: #059669;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 10px;
            }
            button:hover {
              background: #047857;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ OAuth Authorization Successful!</h1>
            
            <div class="instructions">
              <strong>Next Steps:</strong>
              <ol>
                <li>Copy the tokens below</li>
                <li>Add them to your <code>.env.local</code> file</li>
                <li>Restart your development server</li>
                <li>Try the Google Sheets export again</li>
              </ol>
            </div>

            <div class="token-box">
              <div class="token-label">GOOGLE_ACCESS_TOKEN</div>
              <div class="token-value" id="access-token">${tokens.access_token}</div>
              <button onclick="copyToken('access-token')">Copy Access Token</button>
            </div>

            <div class="token-box">
              <div class="token-label">GOOGLE_REFRESH_TOKEN</div>
              <div class="token-value" id="refresh-token">${tokens.refresh_token || 'No refresh token (you may need to revoke access and try again with prompt=consent)'}</div>
              ${tokens.refresh_token ? '<button onclick="copyToken(\'refresh-token\')">Copy Refresh Token</button>' : ''}
            </div>

            <div class="instructions">
              <strong>⚠️ Important:</strong> Keep these tokens secure. Don't commit them to git. Add <code>.env.local</code> to your <code>.gitignore</code> file.
            </div>
          </div>

          <script>
            function copyToken(elementId) {
              const element = document.getElementById(elementId);
              const text = element.textContent;
              navigator.clipboard.writeText(text).then(() => {
                const button = element.nextElementSibling;
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 2000);
              });
            }
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json(
      { 
        error: 'Failed to exchange authorization code for tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

