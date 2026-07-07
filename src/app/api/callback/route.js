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
        <title>Authorization Processing</title>
        <style>body { font-family: sans-serif; padding: 2rem; text-align: center; }</style>
      </head>
      <body>
        <h2>Memproses Login...</h2>
        <p id="status">Mengirim token ke halaman utama...</p>
        <script>
          try {
            const token = "${token}";
            const provider = "github";
            const successMessage = 'authorization:' + provider + ':success:{"token":"' + token + '","provider":"' + provider + '"}';
            
            const statusEl = document.getElementById('status');
            
            if (!token || token === "undefined") {
              statusEl.innerText = "Error: Token tidak didapatkan dari GitHub.";
            } else if (window.opener) {
              statusEl.innerText = "Berhasil mendapatkan token. Mengirim ke CMS...";
              
              // Kirim message ke origin yang sama
              const targetOrigin = window.location.origin;
              window.opener.postMessage(successMessage, targetOrigin);
              
              statusEl.innerText = "Pesan terkirim. Menutup jendela otomatis dalam 2 detik...";
              setTimeout(() => { window.close(); }, 2000);
            } else {
              statusEl.innerText = "Error: Tidak bisa menemukan halaman utama (window.opener). Pastikan ini dibuka sebagai popup.";
            }
          } catch (e) {
            document.getElementById('status').innerText = "Error JavaScript: " + e.message;
          }
        </script>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
