import { DayItinerary, TripDetails, DestinationCatalogItem } from '@/types/itinerary';

export interface TripPlannerInputs {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  travelDate?: string;
  nights?: number;
  adults?: number;
  children?: number;
  childAges?: number[];
  hotelTier?: string;
  vehicle?: string;
  selectedDests?: string[];
  houseboat?: boolean;
  spiceTour?: boolean;
  jeepSafari?: boolean;
  customPlaces?: string[];
  specialNote?: string;
  voucherNumber?: string;
  totalCost?: string;
}

// Generate Day-by-Day Itinerary automatically from trip planner inputs
export function generateItineraryFromInputs(
  inputs: TripPlannerInputs,
  catalog?: DestinationCatalogItem[]
): Partial<TripDetails> {
  const dests = inputs.selectedDests && inputs.selectedDests.length > 0 
    ? inputs.selectedDests 
    : ['Munnar', 'Thekkady', 'Alleppey', 'Kovalam', 'Kanyakumari'];

  const totalNights = inputs.nights || (dests.length > 1 ? Math.max(dests.length + 1, 5) : 5);
  const totalDays = totalNights + 1;

  // Format dates
  let startFormatted = inputs.travelDate || '19th Sept 2026';
  let endFormatted = '25th Sept 2026';
  try {
    if (inputs.travelDate && inputs.travelDate.includes('-')) {
      const parts = inputs.travelDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        startFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const endD = new Date(d);
        endD.setDate(endD.getDate() + totalDays - 1);
        endFormatted = endD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
  } catch (e) {
    // fallback
  }

  // Days list construction
  const days: DayItinerary[] = [];

  // Helper for dates per day
  const getDateForDay = (dayIndex: number): string => {
    try {
      if (inputs.travelDate && inputs.travelDate.includes('-')) {
        const parts = inputs.travelDate.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        d.setDate(d.getDate() + dayIndex);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return `Day ${dayIndex + 1}`;
  };

  // Day 1: Arrival & Transfer to first destination (Usually Munnar or Cochin)
  const firstDest = dests[0] || 'Munnar';
  if (firstDest.toLowerCase().includes('munnar')) {
    days.push({
      dayNumber: 1,
      date: getDateForDay(0),
      title: 'ARRIVAL IN KOCHI → MUNNAR',
      destination: 'Munnar',
      overnightStay: 'The Leaf Munnar Resort',
      route: 'Kochi Airport → Cheeyappara → Valara → Munnar (130 km / 4 hrs)',
      summary: 'Arrive at Kochi and begin your scenic journey towards Munnar, Kerala’s famous hill station. Enjoy lush plantations, winding mountain roads, waterfalls and cool misty landscapes.',
      mealsIncluded: 'Welcome Drink',
      activities: [
        {
          id: 'act-auto-1-1',
          title: 'Kochi Airport pickup and private transfer to Munnar',
          category: 'Sightseeing',
          timing: 'Morning',
          description: 'Warm welcome by chauffeur and scenic mountain drive.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-2',
          title: 'Cheeyappara Waterfalls – refreshing scenic stop on the Munnar route',
          category: 'Nature',
          timing: 'Morning',
          description: 'Cascading natural water rapids alongside the highway.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-3',
          title: 'Valara Waterfalls – picturesque waterfall surrounded by lush greenery',
          category: 'Nature',
          timing: 'Afternoon',
          description: 'Stunning rainforest backdrop and cascading tiers.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-4',
          title: 'Spices Plantation – experience Kerala’s aromatic spice-growing region',
          category: 'Cultural',
          timing: 'Afternoon',
          description: 'Guided tour of cardamom, clove, cinnamon and vanilla gardens.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-5',
          title: 'Flora & Fauna Munnar Eco Park – nature and family-friendly scenic stop (optional)',
          category: 'Nature',
          timing: 'Afternoon',
          description: 'Family friendly eco-garden and nature paths.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-6',
          title: 'Wonder Valley Adventure and Amusement Park amidst misty hills (optional)',
          category: 'Adventure',
          timing: 'Afternoon',
          description: 'Eco-adventure rides and zip-lining amid misty valley.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-1-7',
          title: 'Evening at leisure to enjoy the mountain ambience',
          category: 'Relaxation',
          timing: 'Evening',
          description: 'Relax amidst the crisp hill climate.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });

    // Day 2: Munnar Sightseeing
    days.push({
      dayNumber: 2,
      date: getDateForDay(1),
      title: 'MUNNAR SIGHTSEEING – TEA COUNTRY & SCENIC HIGHLIGHTS',
      destination: 'Munnar',
      overnightStay: 'The Leaf Munnar Resort',
      route: 'Munnar Local Circuit (Eravikulam, Tea Museum, Mattupetty & Echo Point)',
      summary: 'Explore the scenic highlands of Munnar with waterfalls, tea country, gardens and mountain viewpoints.',
      mealsIncluded: 'Buffet Breakfast',
      activities: [
        {
          id: 'act-auto-2-1',
          title: 'Tea Museum – discover Munnar’s tea-growing heritage, subject to opening',
          category: 'Cultural',
          timing: 'Morning',
          description: 'Learn the century-old heritage of tea picking and processing.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-2-2',
          title: 'Eravikulam National Park – visit high-altitude grasslands & Nilgiri Tahr habitat',
          category: 'Nature',
          timing: 'Morning',
          description: 'Home to rare Nilgiri Tahr and rolling shola grass hills.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-2-3',
          title: 'Flower Garden / Botanical Garden and Munnar Gap Road – scenic local sightseeing',
          category: 'Sightseeing',
          timing: 'Afternoon',
          description: 'Vibrant blooms, photo spots and misty road curves.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-2-4',
          title: 'Lockhart Gap View, Mattupetty Dam & Echo Point',
          category: 'Nature',
          timing: 'Afternoon',
          description: 'Serene reservoir, speed boats, and acoustic echo effects.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });
  }

  // Thekkady
  if (dests.some(d => d.toLowerCase().includes('thekkady'))) {
    days.push({
      dayNumber: days.length + 1,
      date: getDateForDay(days.length),
      title: 'MUNNAR → THEKKADY – WILDLIFE & CULTURAL EXPERIENCE',
      destination: 'Thekkady',
      overnightStay: 'PepperVine, Thekkady',
      route: 'Munnar → Lockhart Gap → Kumily / Thekkady (95 km / 3.5 hrs)',
      summary: 'Depart Munnar after breakfast and travel through the lush Western Ghats towards Thekkady.',
      mealsIncluded: 'Buffet Breakfast',
      activities: [
        {
          id: 'act-auto-3-1',
          title: 'Elephant Ride & Bath – optional activity, subject to availability',
          category: 'Adventure',
          timing: 'Morning',
          description: 'Memorable gentle giant interaction and photo opportunity.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-3-2',
          title: 'Boating in Periyar Tiger Reserve – optional activity, subject to availability',
          category: 'Nature',
          timing: 'Afternoon',
          description: 'Scenic cruise on Periyar Lake spotting wildlife along the banks.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-3-3',
          title: 'Jeep Safari – optional activity, subject to availability',
          category: 'Adventure',
          timing: 'Afternoon',
          description: 'Off-road exploration of cardamom forests and high ranges.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-3-4',
          title: 'Kadhakali & Kalaripayattu Show (5:00 PM – 8:00 PM) – evening cultural experience',
          category: 'Cultural',
          timing: 'Evening',
          description: 'Traditional Kerala classical dance drama and ancient martial arts.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });
  }

  // Alleppey
  if (dests.some(d => d.toLowerCase().includes('alleppey') || d.toLowerCase().includes('houseboat'))) {
    days.push({
      dayNumber: days.length + 1,
      date: getDateForDay(days.length),
      title: 'THEKKADY → ALLEPPEY – PREMIUM HOUSEBOAT EXPERIENCE',
      destination: 'Alleppey',
      overnightStay: 'Houseboat, Alleppey',
      route: 'Thekkady → Changanassery → Alleppey Jetty (140 km / 4 hrs)',
      summary: 'After breakfast, proceed to Alleppey (Alappuzha) and board your houseboat for a relaxing backwater experience.',
      mealsIncluded: 'Breakfast, Lunch, High Tea & Dinner on Houseboat',
      activities: [
        {
          id: 'act-auto-4-1',
          title: 'Board the Premium Houseboat and begin the cruise',
          category: 'Relaxation',
          timing: 'Morning',
          description: 'Check in at 12:00 PM with traditional welcome drink.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-4-2',
          title: 'Houseboating All Day with food and stay on board',
          category: 'Relaxation',
          timing: 'Full Day',
          description: 'Cruise through canals, paddy fields, lagoons and traditional Kerala villages.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-4-3',
          title: 'Enjoy meals on board according to the houseboat meal plan',
          category: 'Cultural',
          timing: 'Afternoon',
          description: 'Freshly cooked authentic Kerala feast on board.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-4-4',
          title: 'Alappuzha Beach and Lighthouse – visit subject to time',
          category: 'Sightseeing',
          timing: 'Evening',
          description: 'Historic pier and seaside lighthouse.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });
  }

  // Kovalam
  if (dests.some(d => d.toLowerCase().includes('kovalam'))) {
    days.push({
      dayNumber: days.length + 1,
      date: getDateForDay(days.length),
      title: 'ALLEPPEY → KOVALAM – COASTAL ESCAPE',
      destination: 'Kovalam',
      overnightStay: 'Aadisaktthi Leisure Resort Kovalam',
      route: 'Alleppey → Kollam → Trivandrum → Kovalam (160 km / 4.5 hrs)',
      summary: 'After breakfast, disembark from the houseboat as per the operator schedule and proceed towards Kovalam.',
      mealsIncluded: 'Houseboat Breakfast',
      activities: [
        {
          id: 'act-auto-5-1',
          title: 'Kovalam Beach / Lighthouse – if time permits',
          category: 'Sightseeing',
          timing: 'Afternoon',
          description: 'Iconic striped lighthouse with panoramic Arabian Sea views.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-5-2',
          title: 'Relax by the beach and enjoy the coastal ambience',
          category: 'Relaxation',
          timing: 'Evening',
          description: 'Golden sands, gentle surf, and breezy beachside shacks.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-5-3',
          title: 'Check-in at Leisure Beach Resort, Kovalam',
          category: 'Relaxation',
          timing: 'Evening',
          description: 'Comfortable seaside stay and sunset contemplation.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });
  }

  // Kanyakumari
  if (dests.some(d => d.toLowerCase().includes('kanyakumari'))) {
    days.push({
      dayNumber: days.length + 1,
      date: getDateForDay(days.length),
      title: 'KOVALAM → KANYAKUMARI',
      destination: 'Kanyakumari',
      overnightStay: 'Aadisaktthi Leisure Resort Kovalam',
      route: 'Kovalam → Poovar → Kanyakumari → Kovalam (Excursion 90 km each way)',
      summary: 'Proceed from Kovalam to Kanyakumari and enjoy the iconic coastal landmarks of India’s southern tip.',
      mealsIncluded: 'Buffet Breakfast',
      activities: [
        {
          id: 'act-auto-6-1',
          title: 'Poovar Island – optional visit',
          category: 'Sightseeing',
          timing: 'Morning',
          description: 'Estuary where river, lake, sea and beach converge.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-2',
          title: 'Azhimala Shiva Temple – scenic coastal temple stop',
          category: 'Cultural',
          timing: 'Morning',
          description: 'Magnificent 58-foot coastal sculpture of Lord Shiva facing the sea.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-3',
          title: 'Vivekananda Rock Memorial – visit subject to ferry / weather conditions',
          category: 'Heritage',
          timing: 'Afternoon',
          description: 'Spiritual rock monument surrounded by three oceans.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-4',
          title: 'Arulmigu Devi Temple – temple visit',
          category: 'Cultural',
          timing: 'Afternoon',
          description: 'Ancient 3,000-year-old temple dedicated to Goddess Kanya Kumari.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-5',
          title: 'Thiruvalluvar Statue and Triveni Sangam – iconic Kanyakumari landmarks',
          category: 'Heritage',
          timing: 'Afternoon',
          description: 'Confluence of Arabian Sea, Indian Ocean and Bay of Bengal.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-6',
          title: 'Gandhi Mandapam – historical memorial',
          category: 'Heritage',
          timing: 'Evening',
          description: 'Memorial where Gandhiji’s ashes were kept prior to immersion.',
          isSelected: true,
          isVerified: true,
        },
        {
          id: 'act-auto-6-7',
          title: 'Return back to Kovalam for stay',
          category: 'Relaxation',
          timing: 'Night',
          description: 'Overnight at Kovalam resort.',
          isSelected: true,
          isVerified: true,
        },
      ],
    });
  }

  // Final Day: Departure
  days.push({
    dayNumber: days.length + 1,
    date: getDateForDay(days.length),
    title: 'KOVALAM → KOCHI (OR TRIVANDRUM) DEPARTURE',
    destination: 'Kochi / Trivandrum',
    overnightStay: 'Tour Ends with Beautiful Kerala Memories',
    route: 'Kovalam → Padmanabhaswamy Temple → Airport Drop',
    summary: 'Sree Padmanabhaswamy Temple visit – subject to flight timing and check out. Tour Ends with Beautiful Kerala Memories.',
    mealsIncluded: 'Buffet Breakfast',
    activities: [
      {
        id: 'act-auto-final-1',
        title: 'Sree Padmanabhaswamy Temple visit – subject to flight timing and check out',
        category: 'Cultural',
        timing: 'Morning',
        description: 'World-famous historic architectural wonder and sacred shrine.',
        isSelected: true,
        isVerified: true,
      },
      {
        id: 'act-auto-final-2',
        title: 'Drop off at Airport / Railway Station with cherished memories',
        category: 'Sightseeing',
        timing: 'Afternoon',
        description: 'Safe chauffeur drop as per travel schedule.',
        isSelected: true,
        isVerified: true,
      },
    ],
  });

  // Calculate routeSummary
  const routeSummary = `Kochi → ${dests.join(' → ')} → Kochi`;

  // Stay Plan
  const stayPlan = `2 Nights Munnar • 1 Night Thekkady • 1 Night Alleppey Houseboat • 2 Night Kovalam`;

  const totalNightsCalculated = days.length - 1;
  const totalDaysCalculated = days.length;

  return {
    voucherNumber: inputs.voucherNumber || 'TCT-2026-KER-0195',
    tripTitle: 'KERALA SCENIC ESCAPE',
    guestName: inputs.guestName || 'Mr. Nikhil Sharma',
    guestContact: inputs.guestPhone || '+91 94957 01672',
    guestEmail: inputs.guestEmail || 'travelcare598@gmail.com',
    pickupDate: startFormatted,
    pickupLocation: 'Cochin International Airport (COK)',
    dropoffDate: endFormatted,
    dropoffLocation: 'Thiruvananthapuram International Airport (TRV)',
    durationDays: totalDaysCalculated,
    durationNights: totalNightsCalculated,
    adultsCount: inputs.adults || 2,
    childrenCount: inputs.children || 0,
    childrenAges: inputs.childAges && inputs.childAges.length > 0 ? `${inputs.childAges[0]}yr old` : '',
    vehicleType: inputs.vehicle || '01 Sedan',
    totalPackageCost: inputs.totalCost || '₹81,000.00',
    advancePaid: '₹ 25,000.00',
    balancePayable: '₹ 56,000.00',
    routeSummary: routeSummary,
    specialNotes: inputs.specialNote || 'All sightseeing is subject to weather and road conditions.',
    days: days,
    accommodations: [
      {
        id: 'acc-1',
        destination: 'Munnar',
        hotelName: 'The Leaf',
        roomCategory: 'Green Leaf',
        checkInDate: startFormatted,
        nights: 2,
        mealPlan: 'CP (Buffet Breakfast)',
        status: 'Confirmed',
      },
      {
        id: 'acc-2',
        destination: 'Thekkady',
        hotelName: 'Pepper Vine',
        roomCategory: 'Deluxe Room',
        checkInDate: '21st Sept 2026',
        nights: 1,
        mealPlan: 'CP (Buffet Breakfast)',
        status: 'Confirmed',
      },
      {
        id: 'acc-3',
        destination: 'Alleppey',
        hotelName: 'Houseboat',
        roomCategory: 'Premium Room',
        checkInDate: '22nd Sept 2026',
        nights: 1,
        mealPlan: 'AP (All Meals)',
        status: 'Confirmed',
      },
      {
        id: 'acc-4',
        destination: 'Kovalam',
        hotelName: 'Aadisaktthi Leisure Resort',
        roomCategory: 'Deluxe Room',
        checkInDate: '23rd Sept 2026',
        nights: 2,
        mealPlan: 'CP (Buffet Breakfast)',
        status: 'Confirmed',
      },
    ],
  };
}
