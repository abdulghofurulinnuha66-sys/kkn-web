import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return new NextResponse('No code provided', { status: 400 });
  }

  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  
  if (!client_id || !client_secret) {
    return new NextResponse('GitHub OAuth credentials are not configured in Vercel Environment Variables', { status: 500 });
  }
  
  try {
    // Exchange the code for an access token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      return new NextResponse(`GitHub Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const token = data.access_token;
    
    // Decap CMS expects a postMessage with the token sent back to the opener window
    // Format: authorization:github:success:{"token":"...", "provider":"github"}
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Successful</title>
      </head>
      <body>
        <p>Authorization successful. You can close this window.</p>
        <script>
          const token = "${token}";
          const provider = "github";
          const message = "authorization:" + provider + ":success:" + JSON.stringify({ token: token, provider: provider });
          window.opener.postMessage(message, "*");
          window.close();
        </script>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
