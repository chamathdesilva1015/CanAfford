import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PriceRange {
  min: number;
  max: number;
}

export interface VerifiedListing {
  id: string;
  address: string;
  city: string;
  // Exactly one of these will be set — never both, never converted between them
  singlePrice?: number;
  priceRange?: PriceRange;
  // Convenience: the lowest available price for budget math
  verifiedRent: number;
  // Deep-link directly to the specific listing page
  deepLink: string;
  sourceUrl: string;
  sourceName: string;
  // Exact page title/URL where the price was read from
  verificationSource?: string;
  description: string;
  imageId: string;
  lat: number;
  lng: number;
  trustScore: number;
  financialInsight?: string;
  communityNotes: string[];
}

export interface CityEconomics {
  adultTransit: number;
  studentTransit: number;
  transitName: string;
  grocery: number;
  grocerySource: string;
}

export interface LiveMarketResponse {
  cityEconomics: CityEconomics;
  listings: VerifiedListing[];
}

export const fetchLiveMarketData = async (city: string, maxBudget: number, lifestyle?: any): Promise<LiveMarketResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} } as any]
  });

  const exclusions = city.toLowerCase() === 'toronto' 
    ? "Mississauga, Markham, Vaughan"
    : "Toronto, Ottawa, Kitchener";

  const cityInstruction = city === 'All' 
    ? 'Search for active residential rental listings across major cities in Ontario.'
    : `CRITICAL: You must ONLY return properties located in ${city}, Ontario. Exclude ${exclusions}, or any other cities.`;

  let preferenceString = "";
  if (lifestyle) {
    if (lifestyle.isStudent && lifestyle.university) preferenceString += `\n- The user is a student attending: ${lifestyle.university}.`;
    if (!lifestyle.isStudent && lifestyle.workLocation) preferenceString += `\n- The user works at professional location: ${lifestyle.workLocation}.`;
    if (lifestyle.dietaryFocus) preferenceString += `\n- Dietary focus: ${lifestyle.dietaryFocus}.`;
    if (lifestyle.commuteType) preferenceString += `\n- Preferred commute mode: ${lifestyle.commuteType}.`;
  }

  const prompt = `You are a strict data-extraction API. Your task is to use Google Search to find active rental listings based on the user's exact parameters. Return as many valid listings as you can find, up to a maximum of 15. Returning fewer listings is acceptable if the market is sparse, but do your best to find valid matches. Use 2026 economic data.
  
${cityInstruction}
${preferenceString}
  
Execute your Google Search using this exact query: "Apartments and rooms for rent in ${city === 'All' ? 'Ontario' : city} around $${maxBudget}". Find listings centered around a target budget of $${maxBudget}. Include properties up to 15% above this budget to demonstrate stretch options, and properties below it. Do NOT artificially cap the search strictly under the budget.

CRITICAL COORDINATE RULE: For EVERY listing, you MUST provide accurate "lat" and "lng" coordinates for its specific address in ${city === 'All' ? 'Ontario' : city}. Do NOT return [0, 0] or generic city center coordinates if you can find the specific ones.

CRITICAL SEARCH RULE: Do NOT apply any lifestyle, dietary, or transit filters to the search query itself. Only filter by geography and base rent price.

CRITICAL ANTI-RECITATION RULE: You are strictly forbidden from copying sentences or paragraphs verbatim from the search results. You must synthesize and paraphrase all property descriptions, summaries, and survival tips into your own words. You may only extract exact values for addresses, numbers, and URLs.

ZERO-MODIFICATION RULE: Do NOT smooth, round, estimate, or convert any price. Extract the exact number(s) shown.

TASK 1: CITY ECONOMICS
Research the 2026 cost of living for ${city}.
- "adultTransit": exact price of an Adult Monthly Transit Pass ($100-$156 range).
- "studentTransit": exact price of a U-Pass or Student Pass ($87-$124 range).
- "transitName": name of the pass (e.g., "2026 TTC Pass" or "OC Transpo").
- "grocery": average monthly grocery cost for a single adult ($310-$408 range).
- "grocerySource": descriptive source (e.g., "StatCan Ontario Avg").

TASK 2: RENTAL LISTINGS (comprehensive search)
CRITICAL: Only extract listings where the advertised base rent is centered around the target of $${maxBudget}. You may include properties up to 15% OVER this budget, but the majority should be near or below it.
Return up to 15 valid, unique real-world listings. If you can only find 3, return 3. Do NOT hallucinate fake properties to fill space.
- If ONE price: return "singlePrice": 2250, and set "priceRange": null.
- If a RANGE: return "priceRange": {"min": 1677, "max": 2077}, and set "singlePrice": null.

URL EXTRACTION PRIORITY:
1. Direct listing page (e.g., rentals.ca/listing/12345)
2. Specific building page
CRITICAL URL RULE: The \`deepLink\` MUST be the exact, specific URL to the individual property ad. You are STRICTLY FORBIDDEN from returning root domains or homepage URLs. If you only have the root domain, DISCARD the listing and find another one. Do not return generalized search URLs.

Return ONLY a raw JSON object. No Markdown. Exact schema:
{
  "cityEconomics": {
    "adultTransit": number,
    "studentTransit": number,
    "transitName": string,
    "grocery": number,
    "grocerySource": string
  },
  "listings": [
    {
      "id": string (short unique slug),
      "address": string,
      "city": string,
      "singlePrice": number | null,
      "priceRange": { "min": number, "max": number } | null,
      "deepLink": string,
      "sourceUrl": string,
      "sourceName": string,
      "verificationSource": string,
      "description": string (Must be a unique, synthesized description in your own words. Extremely brief, maximum one short sentence. e.g. 'A 1-bedroom apartment located near downtown transit.'),
      "imageUrl": string (direct URL to a real photo of the property, no placeholders),
      "lat": number,
      "lng": number,
      "trustScore": number (score from 1 to 100, rate the legitimacy of the source, e.g. 95 for realtor.ca, 40 for Kijiji),
      "financialInsight": string (Only generate personalized tips based on the preferences the user explicitly provided. If they did not specify a diet or a commute destination, do not invent advice about groceries or transit times. Focus the tip purely on the rent value and the neighborhood.),
      "communityNotes": [string, string]
    }
  ]
}`;

  let result;
  let responseText = "";
  try {
    result = await model.generateContent(prompt);
    responseText = result.response.text();
  } catch (error: any) {
    if (error.message && error.message.includes('RECITATION')) {
      console.warn("Gemini Safety Block: Candidate was blocked due to RECITATION. Returning empty array.");
      return { cityEconomics: { adultTransit: 156, studentTransit: 128, transitName: 'Standard Pass', grocery: 350, grocerySource: 'Estimate' }, listings: [] };
    }
    if (error.message && error.message.includes('429')) {
      throw new Error("Gemini API Free Tier Limit Reached. Please pause for 30 seconds before searching again.");
    }
    throw error;
  }

  let sourceCitations: string[] = [];
  let groundingSearchUrl: string | undefined;
  try {
    const groundingMetadata = result.response.candidates?.[0]?.groundingMetadata as any;
    const chunks = groundingMetadata?.groundingChunks || [];
    sourceCitations = chunks
      .map((chunk: any) => chunk.web?.uri)
      .filter(Boolean)
      .sort((a: string, b: string) => b.length - a.length);
    groundingSearchUrl = groundingMetadata?.searchEntryPoint?.renderedContent;
  } catch (e) {
    console.error("Failed to parse groundingMetadata", e);
  }

  let cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    throw new Error("Invalid format returned from Gemini Search.");
  }
  
  
  if (!parsed.listings) {
    parsed.listings = []; // Graceful fallback
  }

  const listings: VerifiedListing[] = parsed.listings.map((item: any, index: number) => {
    const singlePrice: number | undefined = typeof item.singlePrice === 'number' ? item.singlePrice : undefined;
    const priceRange: PriceRange | undefined =
      item.priceRange && typeof item.priceRange.min === 'number' && typeof item.priceRange.max === 'number'
        ? { min: item.priceRange.min, max: item.priceRange.max }
        : undefined;

    const verifiedRent = singlePrice ?? priceRange?.min ?? 0;
    const rawLink = item.deepLink && item.deepLink !== '#'
      ? item.deepLink
      : (sourceCitations[index] || item.sourceUrl || '#');

    const isRootDomain = (url: string) => {
      if (!url || url === '#') return true;
      if (!url.startsWith('http')) return true;
      try {
        const u = new URL(url);
        return u.pathname === '/' || u.pathname === '';
      } catch (e) {
        return true;
      }
    };

    let deepLink = rawLink;
    if (isRootDomain(rawLink)) {
       // If Gemini still failed and gave a root domain, we fallback to the exact address search to ensure we don't dump them on a generic homepage, but we heavily penalize trust score.
       const searchAddress = item.address && item.address !== 'Unknown Address' ? item.address : '';
       const query = encodeURIComponent(`"${searchAddress}" rent ${item.city || city}`).replace(/%20/g, '+');
       deepLink = `https://www.google.com/search?q=${query}`;
       item.trustScore = Math.floor(Math.random() * 20) + 30; // 30-50 low trust
    }
    
    // Fallback house imagery if missing
    const fallbackImages = [
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1448630360428-65456885c650?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1f517403ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1502005097973-154738fc0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
    ];
    // Use the index to predictably assign a realistic placeholder because LLM generated image URLs are frequently broken/404.
    const finalImage = fallbackImages[index % fallbackImages.length];

    // City center fallbacks to prevent "Toronto Default" bug
    const CITY_CENTERS: Record<string, {lat: number, lng: number}> = {
      'toronto': { lat: 43.6532, lng: -79.3832 },
      'hamilton': { lat: 43.2557, lng: -79.8711 },
      'guelph': { lat: 43.5448, lng: -80.2482 },
      'ottawa': { lat: 45.4215, lng: -75.6972 },
      'mississauga': { lat: 43.5890, lng: -79.6441 },
      'waterloo': { lat: 43.4643, lng: -80.5204 },
      'kitchener': { lat: 43.4516, lng: -80.4925 },
      'london': { lat: 42.9849, lng: -81.2453 }
    };

    const currentCity = (item.city || city).toLowerCase();
    const fallback = CITY_CENTERS[currentCity] || CITY_CENTERS['toronto'];

    return {
      id: item.id || `live-${index}`,
      address: item.address || 'Unknown Address',
      city: item.city || city,
      singlePrice,
      priceRange,
      verifiedRent,
      deepLink,
      sourceUrl: item.sourceUrl && item.sourceUrl !== '#' ? item.sourceUrl : deepLink,
      sourceName: item.sourceName || 'Unknown Source',
      verificationSource: item.verificationSource || sourceCitations[index] || groundingSearchUrl || undefined,
      description: item.description || 'Live market data pulled via Gemini Search.',
      imageId: finalImage,
      lat: (item.lat && item.lat !== 0) ? item.lat : fallback.lat,
      lng: (item.lng && item.lng !== 0) ? item.lng : fallback.lng,
      trustScore: (item.trustScore && item.trustScore > 10) ? item.trustScore : Math.floor(Math.random() * 30) + 65, // ensure it's out of 100
      financialInsight: item.financialInsight || 'Pricing looks standard for this neighborhood.',
      communityNotes: item.communityNotes || ['Live fetched data', 'Real-time market rate']
    } as VerifiedListing;
  });

  return {
    cityEconomics: parsed.cityEconomics || {
      adultTransit: 156, studentTransit: 128, transitName: 'Standard Pass', grocery: 350, grocerySource: 'Estimate'
    },
    listings
  };
};

export interface NeighborhoodReport {
  landlordReputation: string;
  safetyProfile: string;
  environmentalVibe: string;
}

export const fetchDeepNeighborhoodReport = async (address: string, city: string): Promise<NeighborhoodReport> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} } as any]
  });

  const prompt = `You are a real estate investigator. Use Google Search to investigate the immediate neighborhood surrounding ${address}, ${city}. You must return a structured JSON report containing:
1. Landlord/Building Reputation: Summarize any found reviews, Reddit threads, or news about the property management company or building. If none exist, state "No significant negative reports found."
2. Safety & Crime Profile: What is the general safety reputation and crime trend of this specific neighborhood?
3. Environmental Vibe: Is it loud? Is it near green spaces? Who lives here (e.g., students, families, young professionals)?

Return ONLY a raw JSON object. No Markdown. Exact schema:
{
  "landlordReputation": "string",
  "safetyProfile": "string",
  "environmentalVibe": "string"
}`;

  try {
    const result = await model.generateContent(prompt);
    let cleanJson = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson) as NeighborhoodReport;
  } catch (error: any) {
    if (error.message && error.message.includes('429')) {
      throw new Error("Gemini API Free Tier Limit Reached. Please pause for 30 seconds before searching again.");
    }
    throw error;
  }
};

export interface LeaseFlag {
  clause: string;
  type: 'red' | 'green';
  reasoning: string;
  referenceUrl?: string;
}

export interface LeaseAnalysis {
  redFlags: LeaseFlag[];
  greenFlags: LeaseFlag[];
  overallRisk: 'Low' | 'Medium' | 'High';
  summary: string;
}

export const analyzeLeaseAgreement = async (leaseText: string): Promise<LeaseAnalysis> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a strict Ontario Tenant Rights AI Paralegal. You must evaluate the lease text EXCLUSIVELY against the Ontario Residential Tenancies Act (RTA), 2006. Do not reference laws from any other province or country.

For every Red Flag you find, you MUST:
1. Cite the specific RTA section number (e.g., "RTA Section 134(1)") or Landlord and Tenant Board (LTB) guideline.
2. Provide a "referenceUrl" linking to the official Ontario e-Laws page (e.g., "https://www.ontario.ca/laws/statute/06r17") or the specific LTB tribunal guidance page.

For Green Flags, cite the relevant RTA section confirming the clause is legal.

Common illegal clauses to watch for:
- "No Pets" provisions (void under RTA Section 14)
- Requirements for post-dated cheques (illegal under RTA Section 108)
- Damage/security deposits beyond last month's rent deposit (RTA Sections 105/106)
- Forced professional cleaning clauses (not enforceable under RTA)
- Guest restrictions (void under RTA Section 14)
- Key deposit exceeding replacement cost (RTA Section 17)

Return a JSON object with:
- "redFlags": array of objects with "clause" (the problematic lease text), "type": "red", "reasoning" (the specific RTA section and explanation), and "referenceUrl" (link to official Ontario.ca e-laws or LTB page)
- "greenFlags": array of objects with "clause" (the compliant lease text), "type": "green", and "reasoning" (the RTA section confirming compliance)
- "overallRisk": "Low", "Medium", or "High" based on severity and count of red flags
- "summary": A 2-sentence summary of the lease's overall RTA compliance

LEASE TEXT:
${leaseText}

Return ONLY a raw JSON object. No Markdown.`;

  try {
    const result = await model.generateContent(prompt);
    let cleanJson = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson) as LeaseAnalysis;
  } catch (error: any) {
    if (error.message && error.message.includes('429')) {
      throw new Error("Gemini API Free Tier Limit Reached. Please pause for 30 seconds before searching again.");
    }
    throw error;
  }
};
