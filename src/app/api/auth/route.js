import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  // Decap CMS sends ?provider=github&scope=repo
  const provider = searchParams.get('provider');
  const scope = searchParams.get('scope') || 'repo';
  
  const client_id = process.env.GITHUB_CLIENT_ID;
  
  if (!client_id) {
    return new NextResponse('GitHub Client ID is not configured in Vercel Environment Variables', { status: 500 });
  }

  // Redirect to GitHub OAuth Authorization page
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', client_id);
  authUrl.searchParams.set('scope', scope);
  
  return NextResponse.redirect(authUrl.toString());
}
