import * as postmark from 'postmark';
import { envs } from '@/config';

const client = new postmark.ServerClient(envs.email.postmark);

export async function sendEmail(
  emailOptions: postmark.Models.TemplatedMessage
) {
  try {
    const res = await client.sendEmailWithTemplate(emailOptions);
    return res;
  } catch (error) {
    console.log('POSTMARK ERROR');
    throw new Error(String(error));
  }
}
