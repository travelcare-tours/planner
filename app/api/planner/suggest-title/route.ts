import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Fallback high-quality title generator based on route destinations & duration
function generateFallbackTitles(destinations: string[], nights: number, days: number): string[] {
  const destList = destinations.filter(Boolean);
  const destCount = destList.length;

  if (destCount === 0) {
    return [
      `Enchanting Kerala Scenic Escape (${nights}N/${days}D)`,
      `God's Own Country Discovery Tour`,
      `Signature Kerala Holiday Experience`,
    ];
  }

  const hasMunnar = destList.some(d => /munnar/i.test(d));
  const hasAlleppey = destList.some(d => /alleppey|alappuzha|kumarakom/i.test(d));
  const hasThekkady = destList.some(d => /thekkady|periyar/i.test(d));
  const hasWayanad = destList.some(d => /wayanad/i.test(d));
  const hasKovalam = destList.some(d => /kovalam|poovar|varkala/i.test(d));
  const hasKochi = destList.some(d => /kochi|cochin/i.test(d));

  const suggestions: string[] = [];

  if (hasMunnar && hasAlleppey && hasThekkady) {
    suggestions.push(`Classic Kerala: Misty Munnar, Thekkady Wilds & Alleppey Backwaters`);
    suggestions.push(`Enchanting Kerala Hills & Backwaters Odyssey (${nights}N/${days}D)`);
    suggestions.push(`Grand Kerala Panorama: Munnar, Spice Valleys & Houseboat Serenade`);
  } else if (hasMunnar && hasAlleppey) {
    suggestions.push(`Romantic Kerala: Misty Tea Hills & Houseboat Backwaters (${nights}N/${days}D)`);
    suggestions.push(`Munnar Green Meadows & Alleppey Lagoon Escape`);
    suggestions.push(`Pure Kerala Bliss: Cloud Hills to Palm Fringed Waters`);
  } else if (hasWayanad) {
    suggestions.push(`Misty Wayanad Rainforest & Heritage Wildlife Trail (${nights}N/${days}D)`);
    suggestions.push(`Wild Kerala: Waterfalls, Spice Groves & Cloud Peaks`);
  } else if (hasKovalam || hasAlleppey) {
    suggestions.push(`Tropical Kerala: Backwaters, Sunlit Coast & Heritage Shores (${nights}N/${days}D)`);
    suggestions.push(`Kerala Serenade: Emerald Waters & Golden Beaches`);
  } else {
    const mainStops = destList.slice(0, 3).join(' & ');
    suggestions.push(`Discover Kerala: ${mainStops} Scenic Voyage (${nights}N/${days}D)`);
    suggestions.push(`Captivating Kerala: ${mainStops} Getaway`);
    suggestions.push(`Kerala Wonders: Exploring ${mainStops}`);
  }

  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const destinations: string[] = Array.isArray(body.destinations) ? body.destinations : [];
    const nights = Number(body.nights) || 5;
    const days = Number(body.days) || nights + 1;
    const currentTitle = body.currentTitle || '';

    const fallbackList = generateFallbackTitles(destinations, nights, days);

    // If Gemini API key is available, generate creative, context-aware suggestions
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a senior luxury travel tour copywriter for "Travel Care Tours" in Kerala, India.
Generate 4 distinct, evocative, and attractive tour package titles/headings for a holiday itinerary with the following details:
- Route Destinations: ${destinations.join(' -> ') || 'Kerala Highlights'}
- Duration: ${nights} Nights and ${days} Days
- Current Title: "${currentTitle || 'Kerala Scenic Escape'}"

Guidelines:
1. Reflect the exact destination stops accurately (e.g. Munnar's tea hills, Alleppey's backwaters/houseboat, Thekkady's wildlife/spices, Kovalam's beaches).
2. The titles should sound professional, elegant, inspiring, and ready for a travel voucher or client proposal.
3. Keep titles concise (4 to 9 words).
4. Provide a JSON array of 4 strings only. No markdown formatting, no code fencing, just the raw JSON array.
Example format: ["Title 1", "Title 2", "Title 3", "Title 4"]`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const text = response.text ? response.text.trim() : '';
        // Extract JSON array
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validTitles = parsed.map((t: any) => String(t).replace(/^["']|["']$/g, '').trim()).filter(Boolean);
            if (validTitles.length > 0) {
              return NextResponse.json({
                primaryTitle: validTitles[0],
                suggestions: validTitles,
                source: 'gemini',
              });
            }
          }
        }
      } catch (aiError) {
        console.warn('Gemini title suggestion failed, using intelligent route fallback:', aiError);
      }
    }

    return NextResponse.json({
      primaryTitle: fallbackList[0],
      suggestions: fallbackList,
      source: 'route-rules',
    });
  } catch (err: any) {
    console.error('Error in suggest-title route:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to suggest title' },
      { status: 500 }
    );
  }
}
