export abstract class CaptchaPort {
  abstract verify(token: string, ip?: string): Promise<{ success: boolean }>;
}
