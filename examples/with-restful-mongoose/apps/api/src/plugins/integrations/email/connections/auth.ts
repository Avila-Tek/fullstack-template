import { defaultTemplateModel, From } from '../utils/constants';
import { sendEmail } from '../utils/send';

export interface SendWelcomeEmailInput {
  email: string;
  name: string;
  authToken: string;
}
async function sendWelcomeEmail({
  email,
  name,
  authToken,
}: SendWelcomeEmailInput) {
  const emailOptions = {
    From: From,
    To: email,
    TemplateAlias: 'welcome',
    TemplateModel: {
      ...defaultTemplateModel,
      name,
      email,
      sign_in_url: `${process.env.CLIENT_URL}/auth/sign-in`,
      action_url: `${process.env.CLIENT_URL}/auth/sign-up?token=${authToken}`,
    },
  };
  return sendEmail(emailOptions);
}

export const authConnection = Object.freeze({
  sendWelcomeEmail,
});
