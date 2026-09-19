// Client-side high-quality title generator based on route destinations & duration
export function generateFallbackTitles(destinations: string[], nights: number, days: number): string[] {
  const destList = destinations.filter(Boolean);
  const destCount = destList.length;

  if (destCount === 0) {
    return [
      `Enchanting Kerala Scenic Escape (${nights}N/${days}D)`,
      `God's Own Country Discovery Tour`,
      `Signature Kerala Holiday Experience`,
      `Classic Kerala Hills & Backwaters Odyssey`,
    ];
  }

  const hasMunnar = destList.some((d) => /munnar/i.test(d));
  const hasAlleppey = destList.some((d) => /alleppey|alappuzha|kumarakom/i.test(d));
  const hasThekkady = destList.some((d) => /thekkady|periyar/i.test(d));
  const hasWayanad = destList.some((d) => /wayanad/i.test(d));
  const hasKovalam = destList.some((d) => /kovalam|poovar|varkala/i.test(d));
  const hasKochi = destList.some((d) => /kochi|cochin/i.test(d));

  const suggestions: string[] = [];

  if (hasMunnar && hasAlleppey && hasThekkady) {
    suggestions.push(`Classic Kerala: Misty Munnar, Thekkady Wilds & Alleppey Backwaters`);
    suggestions.push(`Enchanting Kerala Hills & Backwaters Odyssey (${nights}N/${days}D)`);
    suggestions.push(`Grand Kerala Panorama: Munnar, Spice Valleys & Houseboat Serenade`);
    suggestions.push(`Scenic Kerala Discovery: Misty Tea Hills to Palm Fringed Lagoons`);
  } else if (hasMunnar && hasAlleppey) {
    suggestions.push(`Romantic Kerala: Misty Tea Hills & Houseboat Backwaters (${nights}N/${days}D)`);
    suggestions.push(`Munnar Green Meadows & Alleppey Lagoon Escape`);
    suggestions.push(`Pure Kerala Bliss: Cloud Hills to Palm Fringed Waters`);
    suggestions.push(`Kerala Serenade: Tea Plantations & Backwater Houseboat`);
  } else if (hasWayanad) {
    suggestions.push(`Misty Wayanad Rainforest & Heritage Wildlife Trail (${nights}N/${days}D)`);
    suggestions.push(`Wild Kerala: Waterfalls, Spice Groves & Cloud Peaks`);
    suggestions.push(`Verdant Wayanad & Western Ghats Nature Odyssey (${nights}N/${days}D)`);
    suggestions.push(`Scenic Wayanad Hillocks & Heritage Retreat`);
  } else if (hasKovalam || hasAlleppey) {
    suggestions.push(`Tropical Kerala: Backwaters, Sunlit Coast & Heritage Shores (${nights}N/${days}D)`);
    suggestions.push(`Kerala Serenade: Emerald Waters & Golden Beaches`);
    suggestions.push(`South Kerala Coastal Magic: Backwaters & Sun-Kissed Beaches (${nights}N/${days}D)`);
    suggestions.push(`Enchanting Backwaters & Arabian Sea Coastal Holiday`);
  } else {
    const mainStops = destList.slice(0, 3).join(' & ');
    suggestions.push(`Discover Kerala: ${mainStops} Scenic Voyage (${nights}N/${days}D)`);
    suggestions.push(`Captivating Kerala: ${mainStops} Getaway`);
    suggestions.push(`Kerala Wonders: Exploring ${mainStops} (${nights}N/${days}D)`);
    suggestions.push(`Signature Kerala Tour: ${mainStops} Experience`);
  }

  return suggestions;
}
