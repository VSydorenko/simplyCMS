import { supabase } from '@/integrations/supabase/client';
import { ShippingZone, Location } from './types';

interface CustomerLocation {
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
}

/**
 * Find the most specific shipping zone for a customer location
 * Zones are checked in order of sort_order (priority)
 * Returns default zone if no specific match found
 */
export async function findShippingZone(
  customerLocation: CustomerLocation
): Promise<ShippingZone | null> {
  // Fetch all active zones with their locations
  const { data: zones, error } = await supabase
    .from('shipping_zones')
    .select(`
      *,
      shipping_zone_locations (
        *,
        location:locations (*)
      )
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !zones) {
    console.error('Error fetching shipping zones:', error);
    return null;
  }

  // Find matching zone
  for (const zone of zones) {
    const zoneWithType = zone as unknown as ShippingZone & {
      shipping_zone_locations: Array<{
        location_type: string;
        location_code: string | null;
        postcode_from: string | null;
        postcode_to: string | null;
        location: Location | null;
      }>;
    };

    // Skip default zone for now (it's fallback)
    if (zoneWithType.is_default) continue;

    const locations = zoneWithType.shipping_zone_locations || [];
    
    // Check if customer matches any zone location
    for (const loc of locations) {
      if (matchesZoneLocation(loc, customerLocation)) {
        return zoneWithType;
      }
    }
  }

  // Return default zone if exists
  const defaultZone = zones.find(z => (z as unknown as ShippingZone).is_default);
  return defaultZone as unknown as ShippingZone || null;
}

/**
 * Check if customer location matches zone location criteria
 */
function matchesZoneLocation(
  zoneLoc: {
    location_type: string;
    location_code: string | null;
    postcode_from: string | null;
    postcode_to: string | null;
    location: Location | null;
  },
  customer: CustomerLocation
): boolean {
  switch (zoneLoc.location_type) {
    case 'all':
      return true;

    case 'country':
      if (zoneLoc.location?.name && customer.country) {
        return normalizeString(zoneLoc.location.name) === normalizeString(customer.country);
      }
      if (zoneLoc.location_code && customer.country) {
        return zoneLoc.location_code.toLowerCase() === customer.country.toLowerCase();
      }
      return false;

    case 'region':
      if (zoneLoc.location?.name && customer.region) {
        return normalizeString(zoneLoc.location.name).includes(normalizeString(customer.region)) ||
               normalizeString(customer.region).includes(normalizeString(zoneLoc.location.name));
      }
      return false;

    case 'city':
      if (zoneLoc.location?.name && customer.city) {
        return normalizeString(zoneLoc.location.name) === normalizeString(customer.city);
      }
      return false;

    case 'postcode':
      if (customer.postcode && zoneLoc.postcode_from && zoneLoc.postcode_to) {
        const customerCode = customer.postcode.replace(/\D/g, '');
        const fromCode = zoneLoc.postcode_from.replace(/\D/g, '');
        const toCode = zoneLoc.postcode_to.replace(/\D/g, '');
        return customerCode >= fromCode && customerCode <= toCode;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Get all locations as a flat list with hierarchy info
 */
export async function getLocationHierarchy(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    console.error('Error fetching locations:', error);
    return [];
  }

  // Build hierarchy
  const locations = data as unknown as Location[];
  const locationMap = new Map<string, Location>();
  locations.forEach(loc => locationMap.set(loc.id, { ...loc, children: [], level: 0 }));

  const rootLocations: Location[] = [];

  locations.forEach(loc => {
    const location = locationMap.get(loc.id)!;
    if (loc.parent_id && locationMap.has(loc.parent_id)) {
      const parent = locationMap.get(loc.parent_id)!;
      location.level = (parent.level || 0) + 1;
      parent.children = parent.children || [];
      parent.children.push(location);
    } else {
      rootLocations.push(location);
    }
  });

  // Flatten with level info for display
  const flattenWithLevel = (locs: Location[], level: number = 0): Location[] => {
    const result: Location[] = [];
    for (const loc of locs) {
      result.push({ ...loc, level });
      if (loc.children && loc.children.length > 0) {
        result.push(...flattenWithLevel(loc.children, level + 1));
      }
    }
    return result;
  };

  return flattenWithLevel(rootLocations);
}
