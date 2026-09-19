import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_DESTINATIONS_CATALOG } from '@/lib/sample-data';
import { TripDetails, DayItinerary } from '@/types/itinerary';

export async function POST(req: NextRequest) {
  try {
    const parsed = await req.json();

    const voucherNumber = parsed.voucher_no || `TCT-${new Date().getFullYear()}-KER-${Math.floor(1000 + Math.random() * 9000)}`;
    const guestName = parsed.guest_name || 'Valued Holiday Guest';
    const guestContact = parsed.guest_phone || '+91 94477 82828';
    const guestEmail = parsed.guest_email || 'guest@travelcaretours.in';
    const adultsCount = Number(parsed.pax_adults) || 2;
    const childrenCount = Number(parsed.pax_children) || 0;
    const childrenAges = parsed.children_ages || '';

    const stays = parsed.stays || [
      { destination: 'Munnar', hotel: 'Amber Dale Luxury Resort', room_category: 'Valley View Suite', nights: 2, meal_plan: 'CP (Breakfast)' },
      { destination: 'Thekkady', hotel: 'The Elephant Court', room_category: 'Executive Room', nights: 1, meal_plan: 'CP (Breakfast)' },
      { destination: 'Alleppey', hotel: 'Lakes & Lagoons Houseboat', room_category: 'AC Deluxe Houseboat', nights: 1, meal_plan: 'AP (All Meals)' },
    ];

    const totalNights = stays.reduce((sum: number, s: any) => sum + (Number(s.nights) || 1), 0);
    const totalDays = totalNights + 1;

    // Create accommodations
    const accommodations = stays.map((s: any, idx: number) => ({
      id: `acc-import-${idx + 1}`,
      destination: s.destination,
      hotelName: s.hotel || 'Selected 4-Star Resort',
      roomCategory: s.room_category || 'Deluxe Room',
      checkInDate: s.check_in || parsed.pickup_date || 'Day 1',
      nights: Number(s.nights) || 1,
      mealPlan: s.meal_plan || 'CP (Breakfast)',
      status: 'Confirmed' as const,
    }));

    // Create day-by-day itineraries matching activities from catalog
    let currentDayNum = 1;
    const days: DayItinerary[] = [];

    for (const stay of stays) {
      const destCatalog = INITIAL_DESTINATIONS_CATALOG.find(
        (c) => c.destination.toLowerCase() === stay.destination.toLowerCase()
      );

      for (let n = 1; n <= (stay.nights || 1); n++) {
        const availableActs = (destCatalog?.defaultActivities || []).map((act, aIdx) => ({
          ...act,
          isSelected: aIdx < 3, // Auto-select top 3 recommended
        }));

        days.push({
          dayNumber: currentDayNum,
          date: `Day ${currentDayNum}`,
          title: n === 1 ? `Arrival in ${stay.destination} & Scenic Exploration` : `${stay.destination} Full Day Sightseeing Circuit`,
          destination: stay.destination,
          overnightStay: `${stay.destination} (${stay.hotel || 'Luxury Resort'})`,
          route: `${stay.destination} Sightseeing Corridor`,
          summary: `Relaxing scenic day discovering tea plantations, wildlife, and natural viewpoints in ${stay.destination}.`,
          mealsIncluded: stay.meal_plan || 'CP (Breakfast)',
          activities: availableActs,
        });

        currentDayNum++;
      }
    }

    // Departure Day
    days.push({
      dayNumber: currentDayNum,
      date: `Day ${currentDayNum}`,
      title: `${parsed.drop_point || 'Cochin'} Departure Transfer`,
      destination: 'Departure',
      overnightStay: 'Home / Onward Flight',
      route: 'Hotel to Airport / Railway Station',
      summary: 'After breakfast, check out of your hotel. Enjoy shopping for spices and souvenirs before your departure transfer.',
      mealsIncluded: 'Buffet Breakfast',
      activities: [],
    });

    const trip: TripDetails = {
      id: `trip-import-${Date.now()}`,
      voucherNumber,
      tripTitle: parsed.trip_title || `Magical Kerala: ${parsed.route || 'Misty Hills & Backwaters'}`,
      guestName,
      guestContact,
      guestEmail,
      adultsCount,
      childrenCount,
      childrenAges,
      durationDays: totalDays,
      durationNights: totalNights,
      pickupDate: parsed.pickup_date || '2026-11-15',
      pickupTime: parsed.pickup_time || '09:30 AM',
      pickupLocation: parsed.pickup_point || 'Cochin International Airport (COK)',
      dropoffDate: parsed.drop_date || '2026-11-20',
      dropoffTime: parsed.drop_time || '05:00 PM',
      dropoffLocation: parsed.drop_point || 'Cochin International Airport (COK)',
      routeSummary: parsed.route || stays.map((s: any) => s.destination).join(' -> '),
      vehicleType: parsed.vehicle || 'AC Toyota Innova Crysta (7-Seater)',
      vehicleNotes: 'Private AC sanitized vehicle with courteous chauffeur at disposal. All fuel, parking, driver bata & toll fees included.',
      totalPackageCost: parsed.total_cost || '₹ 68,000/-',
      costTerms: 'Net Payable inclusive of 5% GST, private chauffeur & confirmed resort stays.',
      advancePaid: '₹ 20,000/-',
      balancePayable: 'Balance on arrival',
      bookingStatus: 'Confirmed',
      inclusions: [
        `Private ${parsed.vehicle || 'AC Innova Crysta'} at disposal from arrival to departure`,
        'All driver allowances, fuel, toll taxes and parking charges',
        'Accommodation in luxury resorts with breakfast (CP)',
        'Traditional welcome drink upon arrival',
        '24/7 dedicated Travel Care Tours customer assistance desk',
      ],
      exclusions: [
        'Airfare / Train tickets to and from Kerala',
        'Entry tickets to national parks, museums & boat tickets',
        'Personal laundry, phone calls & tips',
      ],
      accommodations,
      days,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      trip,
      message: 'Successfully mapped planner form payload into Travel Care Tours itinerary.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process planner form payload' },
      { status: 400 }
    );
  }
}
