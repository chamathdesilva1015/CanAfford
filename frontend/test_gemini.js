import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({path: './.env'});

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [{ googleSearch: {} }]
});

const city = 'Toronto';
const maxBudget = 4400;

const prompt = `You are a strict data-extraction API. Your task is to use Google Search to find active rental listings based on the user's exact parameters. You MUST return an array of EXACTLY 10 to 15 unique listings. Returning 3 listings is a failure. Returning 0 listings is a failure. Use 2026 economic data.
  
CRITICAL: You must ONLY return properties located in ${city}, Ontario. Exclude Toronto, Kitchener, or any other cities.
  
Execute your Google Search using this exact query: "Apartments and rooms for rent in ${city} under $${maxBudget}". If you cannot find enough listings under the budget, find the cheapest available active listings in ${city} to fill the array up to 10.

CRITICAL SEARCH RULE: Do NOT apply any lifestyle, dietary, or transit filters to the search query itself. Only filter by geography and base rent price.

ZERO-MODIFICATION RULE: Do NOT smooth, round, estimate, or convert any price. Extract the exact number(s) shown.

TASK 1: CITY ECONOMICS
Research the 2026 cost of living for ${city}.
- "adultTransit": exact price of an Adult Monthly Transit Pass ($100-$156 range).
- "studentTransit": exact price of a U-Pass or Student Pass ($87-$124 range).
- "transitName": name of the pass (e.g., "2026 TTC Pass" or "OC Transpo").
- "grocery": average monthly grocery cost for a single adult ($310-$408 range).
- "grocerySource": descriptive source (e.g., "StatCan Ontario Avg").

TASK 2: RENTAL LISTINGS (comprehensive search)
CRITICAL: Only extract listings where the advertised base rent is close to or strictly under $${maxBudget}.
You MUST return an array of EXACTLY 10 to 15 unique listings.
- If ONE price: return "singlePrice": 2250, and set "priceRange": null.
- If a RANGE: return "priceRange": {"min": 1677, "max": 2077}, and set "singlePrice": null.

URL EXTRACTION PRIORITY:
1. Direct listing page
2. Specific building page
3. General search page fallback

Return ONLY a raw JSON object. No Markdown. Exact schema:
{
  "cityEconomics": { "adultTransit": number, "studentTransit": number, "transitName": string, "grocery": number, "grocerySource": string },
  "listings": [ { "id": string, "address": string, "city": string, "singlePrice": number, "priceRange": object, "deepLink": string, "sourceUrl": string, "sourceName": string, "verificationSource": string, "description": string, "lat": number, "lng": number, "trustScore": number, "communityNotes": [] } ]
}
`;

model.generateContent(prompt).then(res => {
  let cleanJson = res.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  console.log(JSON.stringify(parsed.listings.map(l => ({city: l.city, rent: l.singlePrice || l.priceRange?.min})), null, 2));
}).catch(console.error);
