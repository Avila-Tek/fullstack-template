import { FastifyRequest } from 'fastify';
import { AuthStrategy } from '../strategy';

export class GoogleAuthStrategy implements AuthStrategy {
  name = 'google';

  public async initiate(): Promise<{ redirectUrl: string }> {
    const queryParams = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      redirect_uri: `${process.env.SERVER_URL}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?${queryParams.toString()}`;

    // Redirect the user to Google
    return { redirectUrl: googleAuthURL };
  }

  public async handleCallback(request: FastifyRequest): Promise<any> {
    const { code } = request.query as { code: string };

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: `${process.env.SERVER_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = (await tokenResponse.json()) as any;

    console.log(tokens);

    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();

    return { userInfo };
  }
}
