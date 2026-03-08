// ─────────────────────────────────────────────────
// voiceService.ts — ElevenLabs TTS Affordability Brief
// Generates a natural-sounding spoken summary of a
// listing's financial breakdown using ElevenLabs API.
// ─────────────────────────────────────────────────

export interface PropertyBriefInput {
  listingId: string;
  address: string;
  city: string;
  rent: number;             // verifiedRent / singlePrice
  hasRange: boolean;
  rentMin?: number;
  rentMax?: number;
  transitLow: number;
  transitHigh: number;
  groceryLow: number;
  groceryHigh: number;
  trueCostLow: number;
  trueCostHigh: number;
  budget: number;
  status: string;           // Affordable / Stretch / Unavailable
  financialTip: string;
}

// In-memory cache: listingId → blob URL
const audioCache = new Map<string, string>();

/**
 * Compose a natural script from the structured brief data.
 */
function composeBriefScript(input: PropertyBriefInput): string {
  const { address, city, rent, hasRange, rentMin, rentMax,
          transitLow, transitHigh, groceryLow, groceryHigh,
          trueCostLow, trueCostHigh, budget, status, financialTip } = input;

  const rentLine = hasRange && rentMin && rentMax
    ? `The market rent ranges from $${rentMin} to $${rentMax} per month.`
    : `The listed rent is $${rent} per month.`;

  const transitLine = transitLow === transitHigh
    ? `Transit costs are $${transitLow} per month.`
    : `Transit costs range from $${transitLow} to $${transitHigh} per month.`;

  const groceryLine = `Groceries are estimated at $${groceryLow} to $${groceryHigh} per month.`;

  const trueCostLine = `After all regional costs, the true monthly cost ranges from $${trueCostLow} to $${trueCostHigh}.`;

  const delta = budget - Math.round((trueCostLow + trueCostHigh) / 2);
  const budgetLine = delta >= 0
    ? `That's $${delta} under your $${budget} budget.`
    : `That's $${Math.abs(delta)} over your $${budget} budget.`;

  const statusLine = `This listing is rated: ${status}.`;

  const tipLine = financialTip ? `Here's a tip: ${financialTip}` : '';

  return [
    `Here's your affordability brief for ${address}, ${city}.`,
    rentLine,
    transitLine,
    groceryLine,
    trueCostLine,
    budgetLine,
    statusLine,
    tipLine
  ].filter(Boolean).join(' ');
}

/**
 * Generate spoken audio for a property brief via ElevenLabs TTS.
 * Returns a blob URL that can be played in an <audio> element.
 * Caches results per listing ID to avoid redundant API calls.
 */
export const generatePropertyBrief = async (input: PropertyBriefInput): Promise<string | null> => {
  // Check cache first
  if (audioCache.has(input.listingId)) {
    return audioCache.get(input.listingId)!;
  }

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
    console.error('Missing VITE_ELEVENLABS_API_KEY. Add your key to .env');
    return null;
  }

  const script = composeBriefScript(input);

  try {
    // Rachel voice — warm, conversational
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.78,
          style: 0.15,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`ElevenLabs ${response.status}: ${errBody}`);
    }

    const audioBlob = await response.blob();
    const blobUrl = URL.createObjectURL(audioBlob);

    // Cache for instant replay
    audioCache.set(input.listingId, blobUrl);
    return blobUrl;

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
};

/**
 * Revoke a cached audio blob URL (cleanup).
 */
export const revokeAudioCache = (listingId: string) => {
  const url = audioCache.get(listingId);
  if (url) {
    URL.revokeObjectURL(url);
    audioCache.delete(listingId);
  }
};
