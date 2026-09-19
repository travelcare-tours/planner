import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_DESTINATIONS_CATALOG } from '@/lib/sample-data';
import { DestinationCatalogItem } from '@/types/itinerary';

// In-memory catalog state for runtime persistence
let currentCatalog: DestinationCatalogItem[] = [...INITIAL_DESTINATIONS_CATALOG];

export async function GET() {
  return NextResponse.json({
    success: true,
    destinations: currentCatalog,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, destination, activity, updatedCatalog } = body;

    if (action === 'set_all' && Array.isArray(updatedCatalog)) {
      currentCatalog = updatedCatalog;
      return NextResponse.json({ success: true, destinations: currentCatalog });
    }

    if (action === 'add_destination' && destination) {
      const exists = currentCatalog.some(
        (d) => d.destination.toLowerCase() === destination.destination.toLowerCase()
      );
      if (exists) {
        return NextResponse.json(
          { success: false, message: 'Destination already exists in catalog.' },
          { status: 400 }
        );
      }
      currentCatalog.push(destination);
      return NextResponse.json({ success: true, destinations: currentCatalog });
    }

    if (action === 'add_activity' && destination && activity) {
      const target = currentCatalog.find(
        (d) => d.destination.toLowerCase() === destination.toLowerCase()
      );
      if (!target) {
        return NextResponse.json(
          { success: false, message: 'Destination not found in catalog.' },
          { status: 404 }
        );
      }
      target.defaultActivities.push(activity);
      return NextResponse.json({ success: true, destinations: currentCatalog });
    }

    return NextResponse.json({ success: true, destinations: currentCatalog });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error updating destinations' },
      { status: 500 }
    );
  }
}
