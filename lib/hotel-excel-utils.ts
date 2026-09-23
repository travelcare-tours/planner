import * as XLSX from 'xlsx';
import { HotelModel, RoomModel } from '@/types/itinerary';

// Standard Template Column Names
export const EXCEL_TEMPLATE_COLUMNS = [
  'Destination',
  'Hotel Name',
  'Star Rating',
  'Room Category',
  'Base B2B Rate (CP)',
  'Status (Active/Inactive)'
] as const;

export interface ExcelHotelRow {
  destination: string;
  hotel_name: string;
  star_rating: number;
  room_category: string;
  base_b2b_rate: number;
  status: boolean;
}

// Generate unique ID helper
function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Download a Blob as a file in the browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download the official Travel Care Tours Hotel & Room Excel template (.xlsx)
 */
export function generateHotelExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Template Sheet with realistic sample Kerala properties and multiple room types
  const templateRows = [
    [
      'Destination',
      'Hotel Name',
      'Star Rating',
      'Room Category',
      'Base B2B Rate (CP)',
      'Status (Active/Inactive)'
    ],
    // Munnar Property with 2 room categories
    ['Munnar', 'The Leaf Munnar Resort', 4, 'Silver Leaf Valley View', 3200, 'Active'],
    ['Munnar', 'The Leaf Munnar Resort', 4, 'Golden Leaf Cottage', 4400, 'Active'],
    // Munnar 5-star
    ['Munnar', 'Blanket Hotel & Spa', 5, 'Premier Mountain View', 5500, 'Active'],
    ['Munnar', 'Blanket Hotel & Spa', 5, 'Valley View Suite', 7800, 'Active'],
    // Thekkady Property
    ['Thekkady', 'Greenwoods Resort Thekkady', 4, 'Aranya Superior Room', 3200, 'Active'],
    ['Thekkady', 'Greenwoods Resort Thekkady', 4, 'Ranni Plunge Pool Villa', 6800, 'Active'],
    // Alleppey Houseboats (all meals base CP tariff)
    ['Alleppey', 'Travel Care Deluxe A/C Houseboat', 4, '1 BHK Private Deluxe AC (All Meals)', 7500, 'Active'],
    ['Alleppey', 'Travel Care Deluxe A/C Houseboat', 4, '2 BHK Private Deluxe AC (All Meals)', 10500, 'Active'],
    // Kovalam Coastal Resort
    ['Kovalam', 'Uday Samudra Leisure Beach Hotel', 5, 'Atrium Sea Facing Room', 4500, 'Active'],
    ['Kovalam', 'Uday Samudra Leisure Beach Hotel', 5, 'Exotica Ocean View Suite', 7200, 'Active'],
    // Cochin Business Hotel
    ['Cochin', 'Radisson Blu Kochi', 5, 'Superior King Room', 3800, 'Active'],
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet(templateRows);

  // Set column widths for readability
  wsTemplate['!cols'] = [
    { wch: 16 }, // Destination
    { wch: 34 }, // Hotel Name
    { wch: 12 }, // Star Rating
    { wch: 38 }, // Room Category
    { wch: 20 }, // Base B2B Rate (CP)
    { wch: 24 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Hotel Inventory Template');

  // 2. Instructions Sheet
  const instructionRows = [
    ['TRAVEL CARE TOURS - HOTEL & ROOM INVENTORY UPLOAD GUIDE'],
    [''],
    ['Field Name', 'Required?', 'Allowed Values / Examples', 'Description'],
    ['Destination', 'Yes', 'Munnar, Thekkady, Alleppey, Kovalam, Cochin, Poovar, Wayanad, etc.', 'The Kerala destination city or region.'],
    ['Hotel Name', 'Yes', 'e.g. The Leaf Munnar Resort', 'Exact name of the resort or partner property.'],
    ['Star Rating', 'Optional', '1 to 5 (e.g. 4)', 'Hotel official star classification.'],
    ['Room Category', 'Yes', 'e.g. Premium Valley View, Deluxe Cottage', 'Name of the specific room category or suite.'],
    ['Base B2B Rate (CP)', 'Yes', 'e.g. 3200 (Numbers only)', 'Base contracted B2B rate per room per night on CP (Breakfast).'],
    ['Status (Active/Inactive)', 'Optional', 'Active or Inactive (Default: Active)', 'Set to Inactive if property is closed or temporarily suspended.'],
    [''],
    ['IMPORTANT TIPS FOR BULK UPLOAD:'],
    ['1. Multiple Rooms per Hotel: Add multiple rows with the exact same Destination and Hotel Name. They will automatically be grouped into one hotel with multiple room categories.'],
    ['2. Rates: Enter numbers only (e.g., 3200). Do not include currency symbols like Rs or commas.'],
    ['3. Existing Hotels: If you upload a hotel that already exists by name, you can choose to Merge & Update its rates or Replace the whole catalog.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
  wsInstructions['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 45 },
    { wch: 55 },
  ];

  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Reference');

  // Write and download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'TravelCare_Hotel_Upload_Template.xlsx');
}

/**
 * Export the current live catalog to an Excel file (.xlsx)
 */
export function exportCurrentHotelsToExcel(hotels: HotelModel[]): void {
  const wb = XLSX.utils.book_new();

  const rows: any[] = [
    [
      'Destination',
      'Hotel Name',
      'Star Rating',
      'Room Category',
      'Base B2B Rate (CP)',
      'Status (Active/Inactive)'
    ],
  ];

  hotels.forEach((hotel) => {
    if (!hotel.rooms || hotel.rooms.length === 0) {
      rows.push([
        hotel.destination,
        hotel.hotel_name,
        hotel.star_rating || 3,
        'Standard Room',
        0,
        hotel.status !== false ? 'Active' : 'Inactive',
      ]);
    } else {
      hotel.rooms.forEach((room) => {
        rows.push([
          hotel.destination,
          hotel.hotel_name,
          hotel.star_rating || 3,
          room.room_category,
          room.base_b2b_rate,
          hotel.status !== false ? 'Active' : 'Inactive',
        ]);
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 34 },
    { wch: 12 },
    { wch: 38 },
    { wch: 20 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Current Hotel Tariffs');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const dateStr = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `TravelCare_Hotel_Tariffs_${dateStr}.xlsx`);
}

/**
 * Helper to match header variants flexibly
 */
function findHeaderIndex(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const k = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (h === k || h.includes(k) || k.includes(h)) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Parse hotels and rooms from an uploaded Excel or CSV file
 */
export async function parseHotelsFromExcel(file: File): Promise<{
  hotels: HotelModel[];
  totalRows: number;
  totalRooms: number;
  warnings: string[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  // Use first sheet
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded workbook contains no sheets.');
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rawRows.length < 2) {
    throw new Error('The uploaded file is empty or missing data rows.');
  }

  // Find header row (search first 5 rows in case of title banners)
  let headerRowIndex = 0;
  let headers: string[] = [];
  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    if (Array.isArray(row) && row.some((cell) => cell && /hotel|destination|room|rate|price/i.test(cell.toString()))) {
      headerRowIndex = r;
      headers = row.map((c) => (c ? c.toString().trim() : ''));
      break;
    }
  }

  if (headers.length === 0) {
    headers = rawRows[0].map((c) => (c ? c.toString().trim() : ''));
  }

  const destCol = findHeaderIndex(headers, ['destination', 'dest', 'location', 'city', 'place']);
  const hotelCol = findHeaderIndex(headers, ['hotelname', 'hotel', 'property', 'propertyname', 'resort']);
  const starCol = findHeaderIndex(headers, ['starrating', 'stars', 'star', 'rating']);
  const roomCol = findHeaderIndex(headers, ['roomcategory', 'roomtype', 'room', 'category']);
  const rateCol = findHeaderIndex(headers, ['baseb2bratecp', 'baseb2brate', 'b2brate', 'rate', 'price', 'tariff', 'cprate', 'cost']);
  const statusCol = findHeaderIndex(headers, ['status', 'active', 'state']);

  if (hotelCol === -1) {
    throw new Error('Could not identify a "Hotel Name" column in the sheet. Please ensure column headers match the template.');
  }

  const warnings: string[] = [];
  // Map keyed by `${destination.toLowerCase()}:::${hotel_name.toLowerCase()}`
  const hotelMap = new Map<string, {
    destination: string;
    hotel_name: string;
    star_rating: number;
    status: boolean;
    rooms: RoomModel[];
  }>();

  let validRowCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || c.toString().trim() === '')) {
      continue; // Skip empty rows
    }

    const hotelName = (row[hotelCol] || '').toString().trim();
    if (!hotelName) {
      warnings.push(`Row ${r + 1} skipped: Missing hotel name.`);
      continue;
    }

    const destination = destCol !== -1 && row[destCol] ? row[destCol].toString().trim() : 'Munnar';
    const starRaw = starCol !== -1 && row[starCol] ? parseInt(row[starCol].toString().replace(/[^0-9]/g, ''), 10) : 4;
    const starRating = isNaN(starRaw) || starRaw < 1 || starRaw > 5 ? 4 : starRaw;

    const roomCategory = roomCol !== -1 && row[roomCol] ? row[roomCol].toString().trim() : 'Standard Room';

    let baseRate = 0;
    if (rateCol !== -1 && row[rateCol] !== undefined && row[rateCol] !== null) {
      const cleanNum = row[rateCol].toString().replace(/[^0-9.]/g, '');
      baseRate = parseFloat(cleanNum) || 0;
    }

    let status = true;
    if (statusCol !== -1 && row[statusCol] !== undefined && row[statusCol] !== null) {
      const statusText = row[statusCol].toString().toLowerCase().trim();
      if (statusText === 'inactive' || statusText === 'false' || statusText === '0' || statusText === 'no') {
        status = false;
      }
    }

    const mapKey = `${destination.toLowerCase()}:::${hotelName.toLowerCase()}`;
    const hotelId = `htl-${destination.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3)}-${hotelName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`;

    if (!hotelMap.has(mapKey)) {
      hotelMap.set(mapKey, {
        destination,
        hotel_name: hotelName,
        star_rating: starRating,
        status,
        rooms: [],
      });
    }

    const entry = hotelMap.get(mapKey)!;
    // Check if room category already exists under this hotel
    const existingRoom = entry.rooms.find((rm) => rm.room_category.toLowerCase() === roomCategory.toLowerCase());
    if (existingRoom) {
      // Update rate if non-zero
      if (baseRate > 0) existingRoom.base_b2b_rate = baseRate;
    } else {
      entry.rooms.push({
        id: createId('rm'),
        hotel_id: hotelId,
        room_category: roomCategory,
        base_b2b_rate: baseRate,
      });
    }

    validRowCount++;
  }

  // Convert map to HotelModel array
  let totalRooms = 0;
  const resultHotels: HotelModel[] = [];

  hotelMap.forEach((val, key) => {
    const [destPart, namePart] = key.split(':::');
    const hotelId = `htl-${destPart.replace(/[^a-z0-9]/g, '').slice(0, 3)}-${namePart.replace(/[^a-z0-9]/g, '').slice(0, 8)}`;

    // Ensure rooms point to this hotel ID
    const finalizedRooms = val.rooms.map((rm, idx) => ({
      ...rm,
      hotel_id: hotelId,
      id: rm.id || `${hotelId}-rm-${idx + 1}`,
    }));

    totalRooms += finalizedRooms.length;

    resultHotels.push({
      id: hotelId,
      destination: val.destination,
      hotel_name: val.hotel_name,
      star_rating: val.star_rating,
      status: val.status,
      rooms: finalizedRooms,
    });
  });

  return {
    hotels: resultHotels,
    totalRows: validRowCount,
    totalRooms,
    warnings,
  };
}
