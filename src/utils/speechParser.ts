import { CategoryName, PaymentMode } from '../types';
import { CATEGORIES, PAYMENT_MODES } from '../data/categories';

export interface ParsedSpeechExpense {
  amount?: number;
  category?: CategoryName;
  paymentMode?: PaymentMode;
  itemName?: string;
  quantity?: number;
  place?: string;
  rawText: string;
  confidence: number;
}

// Word to number mapper for spoken words (e.g., "fifty", "five hundred")
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000
};

export function parseNaturalLanguageExpense(transcript: string): ParsedSpeechExpense {
  const text = transcript.trim().toLowerCase();
  let amount: number | undefined;
  let category: CategoryName | undefined;
  let paymentMode: PaymentMode | undefined;
  let itemName: string | undefined;
  let quantity: number = 1;
  let place: string | undefined;

  // 1. Extract Place (e.g. "at Toll", "in Karur", "at MKCE", "near hostel", "at Annachi")
  const placeMatch = text.match(/(?:at|in|near)\s+([a-z0-9\s\-]+?)(?:\s+(?:via|by|using|through|on|for|with|paid|spent)|\s*$)/i);
  if (placeMatch && placeMatch[1]) {
    const rawPlace = placeMatch[1].trim();
    // Exclude common keywords if misidentified
    const excludedPlaceWords = ['food', 'upi', 'cash', 'card', 'petrol', 'tea', 'snacks', 'tobacco'];
    if (!excludedPlaceWords.includes(rawPlace)) {
      place = rawPlace.charAt(0).toUpperCase() + rawPlace.slice(1);
    }
  }

  // 2. Extract Payment Mode
  if (/\b(upi|gpay|google pay|phone pe|phonepe|paytm|online|qr|scanner|scan)\b/i.test(text)) {
    paymentMode = 'UPI';
  } else if (/\b(cash|by cash|in cash|hand cash)\b/i.test(text)) {
    paymentMode = 'Cash';
  } else if (/\b(card|credit card|debit card|credit|debit)\b/i.test(text)) {
    paymentMode = 'Card';
  } else if (/\b(friend paid|friend|split|someone paid|etti paid|nimal paid|dharan paid|sanjai paid|santhosh paid)\b/i.test(text)) {
    paymentMode = 'Friend Paid';
  }

  // 3. Extract Amount (e.g. "500", "₹500", "50 rupees", "rs 120", "25.50", "spent 300", "paid 40")
  const numericMatch = text.match(/(?:rs\.?|inr|₹|\$|spent|paid|for|cost|worth)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rs\.?|rupees|rupee|bucks|inr|₹)?/i);
  if (numericMatch && numericMatch[1]) {
    amount = parseFloat(numericMatch[1]);
  } else {
    // Try simple word parsing e.g. "fifty rupees", "five hundred"
    const words = text.split(/\s+/);
    let wordSum = 0;
    let tempSum = 0;
    let foundWordNumber = false;
    for (const w of words) {
      if (NUMBER_WORDS[w] !== undefined) {
        foundWordNumber = true;
        const val = NUMBER_WORDS[w];
        if (val === 100 || val === 1000) {
          tempSum = (tempSum || 1) * val;
          wordSum += tempSum;
          tempSum = 0;
        } else {
          tempSum += val;
        }
      }
    }
    if (foundWordNumber && (wordSum + tempSum) > 0) {
      amount = wordSum + tempSum;
    }
  }

  // 4. Extract Category and Specific Items
  // Check Tobacco Products first (priority for specific items)
  if (/\b(coolip|coollip|hans|cigarette|cig|smoke|beedi|bidi|mint|kings|tobacco)\b/i.test(text)) {
    category = 'Tobacco Products';
    if (/\bcoolip|coollip\b/i.test(text)) itemName = 'Coolip';
    else if (/\bhans\b/i.test(text)) itemName = 'Hans';
    else if (/\bcigarette|cig|smoke|kings\b/i.test(text)) itemName = 'Cigarette';
    else if (/\bmint\b/i.test(text)) itemName = 'Mint';
  } else if (/\b(tea|chai|green tea)\b/i.test(text)) {
    category = 'Beverages';
    itemName = 'Tea';
  } else if (/\b(coffee|cold coffee|filter coffee)\b/i.test(text)) {
    category = 'Beverages';
    itemName = 'Coffee';
  } else if (/\b(juice|shake|smoothie|soda|frooti|sting|coke|pepsi|cool drink|lemon juice|beverage|beverages)\b/i.test(text)) {
    category = 'Beverages';
    const juiceMatch = text.match(/\b(juice|shake|smoothie|soda|frooti|sting|coke|pepsi|cool drink|lemon juice)\b/i);
    itemName = juiceMatch ? (juiceMatch[1].charAt(0).toUpperCase() + juiceMatch[1].slice(1)) : 'Juice';
  } else if (/\b(snack|snacks|samosa|puff|chips|biscuit|biscuits|cookies|vadai|vada|bajji|mixture)\b/i.test(text)) {
    category = 'Snacks';
    const snackMatch = text.match(/\b(samosa|puff|chips|biscuit|biscuits|cookies|vadai|vada|bajji|mixture)\b/i);
    itemName = snackMatch ? (snackMatch[1].charAt(0).toUpperCase() + snackMatch[1].slice(1)) : 'Snacks';
  } else if (/\b(petrol|fuel|diesel|gasoline)\b/i.test(text)) {
    category = 'Fuel';
    itemName = 'Petrol';
  } else if (/\b(travel|transportation|bus|train|auto|cab|uber|ola|toll|ticket|fare)\b/i.test(text)) {
    category = 'Transportation';
    if (/\btoll\b/i.test(text)) itemName = 'Toll';
    else if (/\bbus\b/i.test(text)) itemName = 'Bus Ticket';
    else if (/\bauto\b/i.test(text)) itemName = 'Auto Fare';
    else if (/\btrain\b/i.test(text)) itemName = 'Train Ticket';
  } else if (/\b(food|lunch|dinner|breakfast|biryani|meals|hotel|restaurant|swiggy|zomato|parotta|dosa|rice|shawarma|chicken|egg|fried rice|noodles)\b/i.test(text)) {
    category = 'Food';
    const foodItems = text.match(/\b(biryani|parotta|dosa|shawarma|chicken|egg|fried rice|noodles|meals|lunch|dinner|breakfast)\b/i);
    itemName = foodItems ? (foodItems[1].charAt(0).toUpperCase() + foodItems[1].slice(1)) : undefined;
  } else if (/\b(alcohol|beer|liquor|wine|brandy|whiskey)\b/i.test(text)) {
    category = 'Alcohol';
    itemName = 'Alcohol';
  } else if (/\b(movie|cinema|film|entertainment|game|theatre|theater|netflix|prime)\b/i.test(text)) {
    category = 'Entertainment';
    itemName = /\bmovie|cinema|film\b/i.test(text) ? 'Movie Ticket' : undefined;
  } else if (/\b(recharge|mobile|phone recharge|jio|airtel|vi|data)\b/i.test(text)) {
    category = 'Recharge';
    itemName = 'Mobile Recharge';
  } else if (/\b(haircut|salon|shave|grooming|spa|personal care)\b/i.test(text)) {
    category = 'Personal Care';
    itemName = 'Haircut';
  } else if (/\b(education|college|book|books|xerox|printout|fees|exam|pen|pencil|notes)\b/i.test(text)) {
    category = 'Education/Fees';
    if (/\bxerox|printout\b/i.test(text)) itemName = 'Xerox & Printout';
    else if (/\bbook|books\b/i.test(text)) itemName = 'Books';
    else if (/\bfees\b/i.test(text)) itemName = 'College Fees';
  }

  // 5. Quantity extraction (e.g. "2 teas", "3 coolip", "2 x 50", "quantity 2")
  const qtyMatch = text.match(/\b(\d+)\s*(?:nos|packets|pkt|cups|x|bottles|pieces|pcs|qty)\b/i) ||
                   text.match(/\b(?:quantity|qty)\s*(\d+)\b/i) ||
                   text.match(/\b(\d+)\s+(?:tea|coffee|coolip|hans|cigarette|samosa|juice|biryani)\b/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    if (parsedQty > 0 && parsedQty <= 50) {
      quantity = parsedQty;
    }
  }

  // 6. Fallback item extraction if still empty and words exist
  if (!itemName && !category) {
    // Attempt to match directly from category list
    const foundCat = CATEGORIES.find(c => text.includes(c.name.toLowerCase()));
    if (foundCat) {
      category = foundCat.name;
    }
  }

  // Confidence estimation
  let score = 0;
  if (amount !== undefined && amount > 0) score += 40;
  if (category !== undefined) score += 30;
  if (paymentMode !== undefined) score += 20;
  if (itemName !== undefined) score += 10;

  return {
    amount,
    category: category || 'Food',
    paymentMode: paymentMode || 'UPI',
    itemName,
    quantity,
    place,
    rawText: transcript,
    confidence: score
  };
}
