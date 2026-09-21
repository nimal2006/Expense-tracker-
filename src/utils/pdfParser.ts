import { Expense, MemberName, CategoryName, PaymentMode } from '../types';

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

const CATEGORY_KEYWORDS: Partial<Record<CategoryName, string[]>> = {
  'Food': ['food', 'briyani', 'biryani', 'chicken', 'rice', 'mushroom', 'meals', 'hotel', 'tiffin', 'dinner', 'lunch', 'breakfast', 'canteen', 'swiggy', 'zomato', 'restaurant'],
  'Snacks': ['snack', 'snacks', 'tea', 'coffee', 'samosa', 'puff', 'puffs', 'bun', 'ice cream', 'juice', 'shake', 'bonda', 'bakery', 'sweets', 'chocolate'],
  'Transportation': ['transport', 'bus', 'ticket', 'token', 'auto', 'uber', 'rapido', 'ola', 'railway', 'train', 'toll', 'travel', 'pass'],
  'Fuel': ['fuel', 'petrol', 'diesel', 'hp', 'bp', 'indian oil', 'shell', 'bunk'],
  'Recharge': ['recharge', 'jio', 'airtel', 'vi', 'bsnl', 'mobile', 'plan', 'pack', 'dth'],
  'Education/Fees': ['fee', 'fees', 'college', 'exam', 'nptel', 'book', 'books', 'xerox', 'print', 'stationery', 'sem', 'course'],
  'Personal & Lifestyle': ['haircut', 'saloon', 'dress', 'clothes', 'pant', 'shirt', 'shoes', 'footwear', 'grooming', 'barber'],
  'Entertainment': ['movie', 'cinema', 'park', 'game', 'gaming', 'ott', 'netflix', 'prime', 'subscription'],
  'Others': ['atm', 'withdrawal', 'transfer', 'cash', 'other', 'misc', 'general']
};

export function autoCategorizeItem(description: string): CategoryName {
  const lower = (description || '').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return cat as CategoryName;
      }
    }
  }
  return 'Others';
}

export function detectPaymentMode(text: string): PaymentMode {
  const lower = (text || '').toLowerCase();
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('card') || lower.includes('debit') || lower.includes('credit')) return 'Card';
  if (lower.includes('friend') || lower.includes('paid by')) return 'Friend Paid';
  return 'UPI';
}

export function parseDateToAugust2026(dateStr: string): string {
  if (!dateStr) return '2026-08-01';

  // Handle formats like 2026-08-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const parts = dateStr.trim().split('-');
    const day = parts[2].padStart(2, '0');
    return `2026-08-${day}`;
  }

  // Handle formats like 15/08/2026 or 15-08-2026
  const dmyMatch = dateStr.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (dmyMatch) {
    const day = Math.min(31, Math.max(1, parseInt(dmyMatch[1], 10))).toString().padStart(2, '0');
    return `2026-08-${day}`;
  }

  // Handle format like 15 Aug 2026 or Aug 15
  const wordMatch = dateStr.match(/(\d{1,2})\s*([A-Za-z]+)/) || dateStr.match(/([A-Za-z]+)\s*(\d{1,2})/);
  if (wordMatch) {
    const num = wordMatch[1].match(/^\d+$/) ? wordMatch[1] : wordMatch[2];
    const day = Math.min(31, Math.max(1, parseInt(num, 10))).toString().padStart(2, '0');
    return `2026-08-${day}`;
  }

  return '2026-08-15';
}

export function parseExpensesFromText(text: string, defaultMember: MemberName = 'Etti'): Expense[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: Expense[] = [];
  
  // Also split by tokens or commas if text is on one line
  const candidates = lines.length < 5 ? text.split(/(?=\b\d{1,2}[\/\.-]\d{1,2}|\b\d{4}-\d{2}-\d{2}|\bAug|\bAUG)/gi) : lines;

  candidates.forEach((line, index) => {
    // Regex to match amount (e.g. ₹150, 150.00, INR 150, Rs.150)
    const amountMatch = line.match(/(?:₹|INR|Rs\.?|USD|\$)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
    if (!amountMatch) return;

    const rawAmount = parseFloat(amountMatch[1]);
    if (isNaN(rawAmount) || rawAmount <= 0) return;

    // Detect date
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2})/i);
    const parsedDate = dateMatch ? parseDateToAugust2026(dateMatch[1]) : `2026-08-${String((index % 28) + 1).padStart(2, '0')}`;

    // Clean description/itemName from line
    let description = line
      .replace(amountMatch[0], '')
      .replace(dateMatch ? dateMatch[0] : '', '')
      .replace(/(?:₹|INR|Rs\.?|UPI|Cash|Card)/gi, '')
      .trim();

    if (!description || description.length < 2) {
      description = 'Statement Transaction';
    }

    // Detect category & payment mode
    const category = autoCategorizeItem(description);
    const paymentMode = detectPaymentMode(line);

    // Detect member if mentioned
    let member: MemberName = defaultMember;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('nimal')) member = 'Nimal';
    else if (lowerLine.includes('dharan')) member = 'Dharan';
    else if (lowerLine.includes('sanjai')) member = 'Sanjai';
    else if (lowerLine.includes('etti')) member = 'Etti';

    const now = new Date();
    const id = `pdf-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    results.push({
      id,
      member,
      amount: Math.round(rawAmount * 100) / 100,
      category,
      paymentMode,
      date: parsedDate,
      time: '12:00',
      itemName: description,
      quantity: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  });

  return results;
}
