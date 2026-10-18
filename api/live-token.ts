import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Please set GEMINI_API_KEY in your Vercel Project Settings.',
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

    res.status(200).json({ token: token.name });
  } catch (error: any) {
    console.error('Failed to create ephemeral live token:', error);
    res.status(500).json({
      error: error?.message || 'Failed to mint ephemeral live token.',
    });
  }
}
