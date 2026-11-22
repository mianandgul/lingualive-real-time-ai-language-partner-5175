import { GoogleGenAI } from '@google/genai';

function isMissingOrInvalidKeyMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('api_key') ||
    lower.includes('api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthorized') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('403')
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.LIVE_API_KEY || '';
  if (!apiKey) {
    console.error('[api/token] Missing GEMINI_API_KEY / LIVE_API_KEY in environment variables.');
    return res.status(503).json({
      errorCode: 'MISSING_API_KEY',
      error: 'Voice service not configured. Please check API Key in Vercel Settings',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
      },
    });

    if (!token?.name) {
      console.error('[api/token] authTokens.create returned empty token object:', token);
      return res.status(500).json({
        errorCode: 'TOKEN_CREATE_FAILED',
        error: 'Live voice token response was empty.',
      });
    }

    return res.status(200).json({ token: token.name });
  } catch (error: any) {
    const errMsg = error?.message || String(error) || 'Failed to mint ephemeral live token.';
    console.error('[api/token] Failed to create ephemeral live token:', error);

    if (isMissingOrInvalidKeyMessage(errMsg)) {
      return res.status(503).json({
        errorCode: 'MISSING_API_KEY',
        error: 'Voice service not configured. Please check API Key in Vercel Settings',
        details: errMsg,
      });
    }

    return res.status(500).json({
      errorCode: 'TOKEN_CREATE_FAILED',
      error: errMsg,
    });
  }
}
