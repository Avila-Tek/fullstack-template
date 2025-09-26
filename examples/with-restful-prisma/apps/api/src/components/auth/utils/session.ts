import { JwtUserPayload, TUser } from '@repo/schemas';
import jwt from 'jsonwebtoken';
import { BrowserDetectInfo } from '@/types/browser';
import { getGeoLocationFromIP } from '@/utils/ip-location';

export async function generateSession(
  user: TUser,
  browser: BrowserDetectInfo,
  ip: string
) {
  const ipLocation = await getGeoLocationFromIP(ip);

  const tokenPayload: JwtUserPayload = { id: String(user.id) };
  const token = jwt.sign(tokenPayload, process.env.SECRET!);

  // TODO: define session type
  const session: any = {
    token,
    device: {
      os: browser.os || 'unknown',
      browser: browser.name || 'unknown',
      name: browser.name || 'unknown',
      version: browser.version || 'unknown',
      isMobile: browser.mobile || false,
    },
    slug: '',
    expirationDate: new Date(Date.now() + 744 * 60 * 60 * 1000),
    location: {
      city: ipLocation.city || '',
      countryCode: ipLocation.countryCode || '',
      regionCode: ipLocation.regionCode || '',
      continentCode: ipLocation.continentCode || '',
      timezone: ipLocation.timezone || '',
      countryLanguages: ipLocation.countryLanguages || ['en-US'],
    },
    ip,
  };

  return session;
}
