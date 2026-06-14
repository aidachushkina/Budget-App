// The default category set and the keyword rules used to auto-assign one.
// Rules are intentionally transparent and fully editable at runtime.

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Dining/Takeaway',
  'Transport',
  'Subscriptions',
  'Utilities/Bills',
  'Shopping',
  'Health & Fitness',
  'Travel',
  'Cash/ATM',
  'Fees',
  'Income',
  'Transfers',
  'Other',
] as const;

export type Category = (typeof DEFAULT_CATEGORIES)[number] | string;

/** Categories considered "essential" for the could-be-cut split. */
export const ESSENTIAL_CATEGORIES = new Set<string>([
  'Groceries',
  'Utilities/Bills',
  'Transport',
  'Health & Fitness',
]);

/** Categories treated as discretionary in the could-be-cut split. */
export const DISCRETIONARY_CATEGORIES = new Set<string>([
  'Dining/Takeaway',
  'Shopping',
  'Subscriptions',
  'Travel',
]);

/**
 * Keyword rules: lowercase substrings -> category. First match wins, evaluated
 * in array order, so put more specific rules earlier. These are seeded into
 * editable state on first load.
 */
export interface KeywordRule {
  keyword: string;
  category: Category;
}

export const DEFAULT_RULES: KeywordRule[] = [
  // Groceries
  ...kw('Groceries', [
    'tesco', 'sainsbury', 'lidl', 'aldi', 'asda', 'waitrose', 'morrisons',
    'co-op', 'coop', 'whole foods', 'wholefoods', 'm&s food', 'iceland',
    'carrefour', 'spar', 'rewe', 'edeka', 'mercadona', 'grocery', 'supermarket',
  ]),
  // Dining / Takeaway
  ...kw('Dining/Takeaway', [
    'restaurant', 'cafe', 'caffe', 'coffee', 'costa', 'starbucks', 'pret',
    'greggs', 'mcdonald', 'kfc', 'burger king', 'subway', 'nando', 'pizza',
    'domino', 'deliveroo', 'just eat', 'justeat', 'uber eats', 'ubereats',
    'wolt', 'takeaway', 'pub', 'bakery', 'kitchen', 'grill', 'sushi',
    'wagamama', 'five guys', 'taco', 'dinner', 'bistro', 'diner',
  ]),
  // Transport
  ...kw('Transport', [
    'uber', 'bolt', 'lyft', 'tfl', 'transport for london', 'trainline',
    'national rail', 'railway', 'tram', 'shell', 'bp',
    'esso', 'texaco', 'petrol', 'fuel', 'parking', 'ringgo', 'taxi', 'cab',
    'flixbus', 'sncf', 'db bahn', 'oyster',
  ]),
  // Subscriptions (streaming / SaaS / memberships)
  ...kw('Subscriptions', [
    'netflix', 'spotify', 'disney', 'disney+', 'amazon prime', 'prime video',
    'youtube premium', 'youtube', 'apple.com/bill', 'apple music', 'icloud',
    'google storage', 'google one', 'dropbox', 'notion', 'adobe', 'microsoft 365',
    'office 365', 'github', 'openai', 'chatgpt', 'patreon', 'audible',
    'now tv', 'nowtv', 'paramount', 'hbo', 'hulu', 'twitch', 'linkedin',
    'canva', 'figma', 'medium', 'substack', 'subscription',
  ]),
  // Utilities / Bills
  ...kw('Utilities/Bills', [
    'vodafone', 'o2', 'ee', 'three', 'giffgaff', 'british gas', 'octopus energy',
    'eon', 'e.on', 'edf', 'sse', 'thames water', 'council tax', 'tv licence',
    'tv license', 'virgin media', 'bt', 'sky', 'broadband', 'electric',
    'water', 'utility', 'insurance', 'phone bill', 'mobile',
  ]),
  // Health & Fitness
  ...kw('Health & Fitness', [
    'pharmacy', 'boots', 'superdrug', 'gym', 'puregym', 'the gym', 'fitness',
    'classpass', 'nhs', 'dentist', 'dental', 'optician', 'specsavers',
    'clinic', 'doctor', 'physio', 'wellness', 'myprotein',
  ]),
  // Travel
  ...kw('Travel', [
    'airbnb', 'booking.com', 'booking com', 'hotel', 'hostel', 'expedia',
    'ryanair', 'easyjet', 'british airways', 'ba.com', 'lufthansa', 'klm',
    'wizz air', 'wizzair', 'jet2', 'emirates', 'airlines', 'airline', 'airport',
    'trip.com', 'hostelworld', 'eurostar',
  ]),
  // Shopping (retail / online)
  ...kw('Shopping', [
    'amazon', 'amzn', 'ebay', 'etsy', 'asos', 'zara', 'h&m', 'uniqlo',
    'primark', 'next retail', 'argos', 'ikea', 'john lewis', 'currys',
    'apple store', 'nike', 'adidas', 'aliexpress', 'shein', 'vinted',
    'decathlon', 'zalando', 'store', 'shop',
  ]),
  // Cash / ATM
  ...kw('Cash/ATM', ['atm', 'cash withdrawal', 'cashpoint', 'cardtronics']),
];

function kw(category: Category, keywords: string[]): KeywordRule[] {
  return keywords.map((keyword) => ({ keyword, category }));
}
