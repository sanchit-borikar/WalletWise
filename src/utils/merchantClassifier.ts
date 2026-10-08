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
