export type MerchantCategory = 
  | 'Dining' 
  | 'Fuel' 
  | 'Grocery' 
  | 'Electronics' 
  | 'Shopping' 
  | 'Pharmacy / Health' 
  | 'Entertainment' 
  | 'Business' 
  | 'Travel'
  | 'Unknown';

const CATEGORY_MAP: Record<MerchantCategory, string[]> = {
  'Dining': ['restaurant', 'cafe', 'food', 'bar', 'starbucks', 'mcdonalds', 'zomato', 'swiggy'],
  'Fuel': ['gas station', 'petrol pump', 'fuel', 'bpcl', 'indianoil', 'hpcl', 'shell'],
  'Grocery': ['supermarket', 'grocery', 'dmart', 'bigbasket', 'blinkit', 'zepto', 'reliance smart'],
  'Electronics': ['electronics', 'croma', 'reliance digital', 'apple', 'samsung', 'vijay sales'],
  'Shopping': ['mall', 'clothing', 'department store', 'amazon', 'flipkart', 'myntra', 'zara', 'h&m'],
  'Pharmacy / Health': ['pharmacy', 'health', 'apollo', 'netmeds', 'pharmeasy', 'hospital', 'clinic'],
  'Entertainment': ['cinema', 'movie', 'bookmyshow', 'pvr', 'inox', 'entertainment', 'amusement'],
  'Business': ['wework', 'coworking', 'office supplies', 'software', 'aws'],
  'Travel': ['airport', 'hotel', 'flight', 'makemytrip', 'agoda', 'indigo', 'marriott', 'taj'],
  'Unknown': []
};

/**
 * Strips out noise from a merchant name to find the core brand.
 */
export function normalizeMerchant(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase();
  
  // Known alias resolutions
  if (normalized.includes('starbucks')) return 'Starbucks';
  if (normalized.includes('bpcl') || normalized.includes('bharat petroleum')) return 'BPCL';
  if (normalized.includes('indian oil') || normalized.includes('indianoil')) return 'IndianOil';
  if (normalized.includes('hpcl') || normalized.includes('hindustan petroleum')) return 'HPCL';
  if (normalized.includes('dmart') || normalized.includes('d-mart')) return 'DMart';
  if (normalized.includes('croma')) return 'Croma';
  if (normalized.includes('amazon')) return 'Amazon';
  if (normalized.includes('mcdonald')) return 'McDonalds';
  
  // Remove common suffixes
  normalized = normalized.replace(/ coffee$/, '')
                         .replace(/ petrol pump$/, '')
                         .replace(/ pvt ltd$/, '')
                         .replace(/ pvt\. ltd\.$/, '')
                         .replace(/ - .*$/, '')
                         .trim();
                         
  // Capitalize first letter of each word
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Infers the best category based on name and Mapbox metadata.
 */
export function classifyCategory(merchantName: string, mapboxCategory?: string): MerchantCategory {
  const normName = merchantName.toLowerCase();
  const mbCat = (mapboxCategory || '').toLowerCase();
  
  const searchString = `${normName} ${mbCat}`;
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (searchString.includes(keyword)) {
        return category as MerchantCategory;
      }
    }
  }
  
  return 'Unknown';
}

// Ordered rules for Mapbox POI categories. More specific spend types come first, so
// "food_and_drink_stores" is groceries, not dining.
const MAPBOX_CATEGORY_RULES: [MerchantCategory, RegExp][] = [
  ['Fuel', /gas_station|fuel|petrol|charging/],
  ['Grocery', /supermarket|grocery|convenience|food_and_drink_stores|hypermarket|greengrocer/],
  ['Pharmacy / Health', /pharmacy|chemist|drugstore|hospital|clinic|doctor|dentist|health/],
  ['Electronics', /electronic|mobile_phone|computer|appliance/],
  ['Entertainment', /cinema|movie|theat|amusement|bowling|entertainment|arcade/],
  ['Travel', /hotel|lodging|motel|hostel|resort|travel|airport|train_station|bus_station/],
  ['Dining', /restaurant|cafe|coffee|fast_food|food|bakery|bar|pub|dessert|ice_cream/],
  ['Shopping', /mall|shopping|clothing|apparel|department|shoe|jewel|fashion|boutique|store|shop/],
];

/**
 * Spend type for a Mapbox place: its POI categories first, then the name (brands like
 * DMart or Croma), then the chip the user picked.
 */
export function classifyMapboxPlace(name: string, categories: string[], maki: string | null, fallback: MerchantCategory): MerchantCategory {
  const cats = [...categories, maki ?? ''].join(' ').toLowerCase();
  const byName = classifyCategory(name);
  // A known brand in the name beats a generic Mapbox tag ("DMart" tagged "department_store").
  if (byName !== 'Unknown' && CATEGORY_MAP[byName].some((k) => k.length > 3 && name.toLowerCase().includes(k))) return byName;
  for (const [category, re] of MAPBOX_CATEGORY_RULES) if (re.test(cats)) return category;
  return byName !== 'Unknown' ? byName : fallback;
}
