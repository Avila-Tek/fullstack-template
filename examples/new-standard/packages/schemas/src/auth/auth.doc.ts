import { z } from 'zod';
import { authDTO } from './auth.dto';

const successResponse = z.object({
  success: z.boolean(),
});

export const authDocs = {
  signIn: {
    summary: 'Sign in with email and password',
    description: `
Authenticates a user using email and password credentials.

**Flow:**
1. Validates credentials against Supabase Auth
2. Checks if email is confirmed (throws error if not)
3. Verifies user exists in database and is active
4. Returns user data with access and refresh tokens

**Possible errors:**
- \`401\` - Invalid credentials or email not confirmed
- \`403\` - User account is disabled
    `.trim(),
    tags: ['auth'],
    body: authDTO.signInInput,
    response: {
      200: authDTO.signInResponse,
    },
  },

  signUp: {
    summary: 'Register a new user account',
    description: `
Creates a new user account with email and password.

**Flow:**
1. Validates that password and rePassword match
2. Checks that email is not already registered
3. Creates user in Supabase Auth (sends confirmation email)
4. Returns requiresEmailConfirmation: true if email verification is needed

**Note:** User will not be created in the database until email is confirmed via the callback endpoint.

**Possible errors:**
- \`400\` - Passwords don't match
- \`409\` - User already exists
    `.trim(),
    tags: ['auth'],
    body: authDTO.signUpInput,
    response: {
      200: authDTO.signUpResponse,
    },
  },

  signOut: {
    summary: 'Sign out the current user',
    description: `
Signs out the authenticated user by invalidating their session in Supabase.

**Requirements:**
- Valid Bearer token in Authorization header

**Possible errors:**
- \`401\` - Invalid or missing token
    `.trim(),
    tags: ['auth'],
    response: {
      200: successResponse,
    },
  },

  currentUser: {
    summary: 'Get the current authenticated user',
    description: `
Returns the profile of the currently authenticated user.

**Requirements:**
- Valid Bearer token in Authorization header

**Flow:**
1. Validates the access token with Supabase
2. Retrieves user from database
3. Checks that user is active

**Possible errors:**
- \`401\` - Invalid or expired token
- \`403\` - User account is disabled
- \`404\` - User not found in database
    `.trim(),
    tags: ['auth'],
    response: {
      200: authDTO.currentUserResponse,
    },
  },

  emailCallback: {
    summary: 'Verify email confirmation callback',
    description: `
Handles the email verification callback from Supabase.

**Flow:**
1. User clicks confirmation link in email
2. Link redirects to this endpoint with token_hash and type parameters
3. Verifies the OTP token with Supabase
4. Creates user in database if not exists
5. Returns authenticated user with tokens

**Parameters:**
- \`token_hash\` - The OTP token from the email link
- \`type\` - The verification type (e.g., 'signup', 'email')

**Use case:** This endpoint is called after user signs up and clicks the email confirmation link.

**Possible errors:**
- \`400\` - Invalid or expired token
    `.trim(),
    tags: ['auth'],
    querystring: authDTO.emailCallbackQuery,
    response: {
      200: authDTO.emailCallbackResponse,
    },
  },

  sendOtp: {
    summary: 'Send OTP code to email',
    description: `
Sends a 6-digit OTP code to the specified email address for verification.

**Flow:**
1. User provides their email address
2. System generates a 6-digit OTP
3. OTP is sent to the email via Postmark
4. OTP expires in 10 minutes

**Use case:** Call this after sign-up to request the verification code.

**Possible errors:**
- \`404\` - User not found
- \`500\` - Failed to send email
    `.trim(),
    tags: ['auth'],
    body: authDTO.sendOtpInput,
    response: {
      200: z.object({ success: z.boolean() }),
    },
  },

  verifyOtp: {
    summary: 'Verify email with OTP code',
    description: `
Verifies email using a 6-digit OTP code sent via email.

**Flow:**
1. User signs up and receives OTP code via email
2. User submits email and OTP code to this endpoint
3. Verifies the OTP with Better Auth
4. Creates user in database if not exists
5. Returns authenticated user with tokens

**Parameters:**
- \`email\` - The user's email address
- \`otp\` - The 6-digit verification code

**Use case:** This endpoint is used with Better Auth for email verification via OTP.

**Possible errors:**
- \`400\` - Invalid or expired OTP code
    `.trim(),
    tags: ['auth'],
    body: authDTO.verifyOtpInput,
    response: {
      200: authDTO.verifyOtpResponse,
    },
  },

  forgotPassword: {
    summary: 'Request password reset OTP',
    description: `
Sends a 6-digit OTP code to the specified email address for password reset.

**Flow:**
1. User provides their email address
2. System generates a 6-digit OTP
3. OTP is sent to the email
4. OTP expires in 10 minutes

**Use case:** Call this when a user has forgotten their password.

**Possible errors:**
- \`404\` - User not found
- \`500\` - Failed to send email
    `.trim(),
    tags: ['auth'],
    body: authDTO.forgotPasswordInput,
    response: {
      200: z.object({ success: z.boolean() }),
    },
  },

  resetPassword: {
    summary: 'Reset password with OTP code',
    description: `
Resets the user's password using a 6-digit OTP code sent via email.

**Flow:**
1. User requests password reset OTP via /forgot-password
2. User receives OTP code via email
3. User submits email, OTP code, and new password to this endpoint
4. Password is updated if OTP is valid

**Parameters:**
- \`email\` - The user's email address
- \`otp\` - The 6-digit verification code
- \`newPassword\` - The new password (min 8 characters)

**Possible errors:**
- \`400\` - Invalid or expired OTP code
- \`400\` - Password does not meet requirements
    `.trim(),
    tags: ['auth'],
    body: authDTO.resetPasswordInput,
    response: {
      200: z.object({ success: z.boolean() }),
    },
  },

  googleAuth: {
    summary: 'Initiate Google OAuth flow',
    description: `
Initiates the Google OAuth authentication flow by redirecting to Google.

**Flow:**
1. Client opens this URL (GET request)
2. Server redirects to Google OAuth
3. User authenticates with Google
4. Google redirects back to Better Auth callback
5. Better Auth redirects to your callbackUrl with session

**Usage:**
Open this URL in a browser or redirect the user to it:
\`GET /api/v1/auth/google?callbackUrl=http://yourapp.com/auth/callback\`

**Query Parameters:**
- \`callbackUrl\` - (Optional) URL to redirect after authentication
    `.trim(),
    tags: ['auth'],
    querystring: authDTO.googleAuthInput,
    response: {
      302: z.object({}),
    },
  },
} as const;
