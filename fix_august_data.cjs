
const fs = require('fs');

const extracted = JSON.parse(fs.readFileSync('aug_extracted.json', 'utf8'));

// Filter out old Etti and Dharan to replace them
const nimal = extracted.filter(x => x.member === 'Nimal');
const sanjai = extracted.filter(x => x.member === 'Sanjai');

// Correct Etti (69) - I will use the PDF data I transcribed
const etti = [
  { member: 'Etti', amount: 200, category: 'Others', itemName: 'Guru Saloon', place: 'NKL', date: '2026-08-01', time: '15:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 40, category: 'Transportation', itemName: 'SRT', place: 'VELUR', date: '2026-08-01', time: '10:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 150, category: 'Hans', itemName: 'Boi kadai', place: 'A S PETTAI', date: '2026-08-03', time: '16:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 40, category: 'Tea/Coffee', itemName: 'Tea', place: 'NKL', date: '2026-08-03', time: '09:30', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 30, category: 'Transportation', itemName: 'govt bus', place: 'TOLL', date: '2026-08-04', time: '08:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 30, category: 'Transportation', itemName: 'govt bus', place: 'TOLL', date: '2026-08-04', time: '08:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 374, category: 'Transportation', itemName: 'AC bus', place: 'GANDHIPURAM -> KARUR', date: '2026-08-05', time: '16:00', paymentMode: 'UPI', quantity: 6 },
  { member: 'Etti', amount: 460, category: 'Food', itemName: 'Tiffen centre', place: 'GANDHIPURAM', date: '2026-08-05', time: '12:00', paymentMode: 'Cash', quantity: 6 },
  { member: 'Etti', amount: 460, category: 'Food', itemName: 'Tiffen centre', place: 'GANDHIPURAM', date: '2026-08-05', time: '12:00', paymentMode: 'Cash', quantity: 6 },
  { member: 'Etti', amount: 40, category: 'Cool Drinks', itemName: 'Golisoda', place: 'TOLL', date: '2026-08-06', time: '17:00', paymentMode: 'Friend Paid', quantity: 1 },
  { member: 'Etti', amount: 90, category: 'Snacks', itemName: 'Peanut Candy', place: 'TOLL', date: '2026-08-06', time: '14:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 90, category: 'Snacks', itemName: 'Peanut Candy', place: 'TOLL', date: '2026-08-06', time: '14:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 14, category: 'Cigarette', itemName: 'Mint', place: 'TOLL', date: '2026-08-06', time: '11:00', paymentMode: 'Friend Paid', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Cigarette', itemName: 'gold filter', place: 'TOLL', date: '2026-08-07', time: '19:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'Kannapiran', place: 'MKCE->NKL', date: '2026-08-07', time: '17:30', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'Kannapiran', place: 'MKCE->NKL', date: '2026-08-07', time: '17:30', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 500, category: 'Others', itemName: 'association fees', place: 'MKCE', date: '2026-08-07', time: '10:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 100, category: 'Entertainment', itemName: 'Ticket', place: 'ABIRAMI', date: '2026-08-08', time: '18:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 75, category: 'Cigarette', itemName: 'kings', place: 'VELLORE', date: '2026-08-08', time: '14:30', paymentMode: 'Cash', quantity: 3 },
  { member: 'Etti', amount: 100, category: 'Cigarette', itemName: 'wave', place: 'VELLORE', date: '2026-08-08', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 41, category: 'Transportation', itemName: 'govt bus', place: 'NKL', date: '2026-08-08', time: '09:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 41, category: 'Transportation', itemName: 'govt bus', place: 'NKL', date: '2026-08-08', time: '09:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 12, category: 'Tea/Coffee', itemName: 'Tea', place: 'Bodhupatti', date: '2026-08-09', time: '16:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 12, category: 'Cigarette', itemName: 'Mint', place: 'Bodhupatti', date: '2026-08-09', time: '16:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 200, category: 'Fuel', itemName: 'petrol', place: 'Keerambur', date: '2026-08-09', time: '13:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Cigarette', itemName: 'Mint', place: 'TOLL', date: '2026-08-09', time: '11:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 50, category: 'Hans', itemName: 'Don', place: 'TOLL', date: '2026-08-10', time: '15:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 30, category: 'Beverages', itemName: 'Goli soda', place: 'TOLL', date: '2026-08-10', time: '12:30', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 30, category: 'Cool Drinks', itemName: 'Goli soda', place: 'TOLL', date: '2026-08-10', time: '12:30', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 30, category: 'Cigarette', itemName: 'Mint', place: 'TOLL', date: '2026-08-10', time: '10:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 50, category: 'Transportation', itemName: 'ticket', place: 'Kannabiran', date: '2026-08-11', time: '17:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 30, category: 'Tobacco Products', itemName: 'Mint', place: 'RR', date: '2026-08-11', time: '14:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 30, category: 'Cigarette', itemName: 'Mint', place: 'RR', date: '2026-08-11', time: '14:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 10, category: 'Cool Drinks', itemName: 'Smooth', place: 'Annachi', date: '2026-08-11', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 20, category: 'Snacks', itemName: 'Jam bun', place: 'ANNACHI', date: '2026-08-11', time: '11:30', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Tobacco Products', itemName: 'Mint', place: 'TOLL', date: '2026-08-12', time: '14:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Cigarette', itemName: 'Mint', place: 'TOLL', date: '2026-08-12', time: '14:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 900, category: 'Recharge', itemName: '2 GB UNLIMITED', place: 'HOME', date: '2026-08-12', time: '09:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'Kannabiran', place: 'NKL', date: '2026-08-13', time: '17:15', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 120, category: 'Hans', itemName: 'CL', place: 'KARUR', date: '2026-08-13', time: '11:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 120, category: 'Tobacco Products', itemName: 'Hans CL', place: 'KARUR', date: '2026-08-13', time: '11:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 300, category: 'Alcohol', itemName: 'beer', place: 'TOLL', date: '2026-08-14', time: '19:30', paymentMode: 'Cash', quantity: 4 },
  { member: 'Etti', amount: 300, category: 'Liquor', itemName: 'beer', place: 'TOLL', date: '2026-08-14', time: '19:30', paymentMode: 'Cash', quantity: 4 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'bus ticket', place: 'srt', date: '2026-08-14', time: '15:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 10, category: 'Cool Drinks', itemName: 'smooth', place: 'Annachi', date: '2026-08-14', time: '12:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 20, category: 'Snacks', itemName: 'cone,2 bites', place: 'Annachi', date: '2026-08-14', time: '11:00', paymentMode: 'UPI', quantity: 3 },
  { member: 'Etti', amount: 200, category: 'Fuel', itemName: 'petrol', place: 'TOLL', date: '2026-08-15', time: '11:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 50, category: 'Transportation', itemName: 'ticket', place: 'bus', date: '2026-08-17', time: '17:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 60, category: 'Tobacco Products', itemName: 'Hans cl', place: 'karuj', date: '2026-08-18', time: '14:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 60, category: 'Hans', itemName: 'cl', place: 'karuj', date: '2026-08-18', time: '14:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 18, category: 'Others', itemName: 'xerox', place: 'mkce', date: '2026-08-18', time: '11:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 100, category: 'Transportation', itemName: 'ticket', place: 'karur', date: '2026-08-19', time: '16:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 46, category: 'Cigarette', itemName: 'mnt', place: 'dhdhy', date: '2026-08-21', time: '15:30', paymentMode: 'UPI', quantity: 2 },
  { member: 'Etti', amount: 55, category: 'Snacks', itemName: 'bun', place: 'anna', date: '2026-08-21', time: '12:00', paymentMode: 'UPI', quantity: 2 },
  { member: 'Etti', amount: 50, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-22', time: '17:00', paymentMode: 'Cash', quantity: 2 },
  { member: 'Etti', amount: 50, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-23', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 70, category: 'Hans', itemName: 'Hans', place: '-', date: '2026-08-24', time: '14:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-25', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 25, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-26', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 25, category: 'Transportation', itemName: 'Transportation', place: '-', date: '2026-08-26', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 50, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-27', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Cigarette', itemName: 'Mint', place: '-', date: '2026-08-28', time: '15:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 15, category: 'Tobacco Products', itemName: 'Cigarette', place: '-', date: '2026-08-28', time: '15:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 150, category: 'Others', itemName: 'Others', place: '-', date: '2026-08-29', time: '18:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 378, category: 'Snacks', itemName: 'Snacks', place: '-', date: '2026-08-29', time: '16:00', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 41, category: 'Cigarette', itemName: 'Mint', place: '-', date: '2026-08-29', time: '14:30', paymentMode: 'UPI', quantity: 1 },
  { member: 'Etti', amount: 25, category: 'Transportation', itemName: 'Ticket', place: '-', date: '2026-08-29', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 25, category: 'Transportation', itemName: 'Transportation', place: '-', date: '2026-08-29', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Etti', amount: 60, category: 'Transportation', itemName: 'Bus Ticket', place: '-', date: '2026-08-31', time: '11:00', paymentMode: 'Cash', quantity: 1 }
];

// Correct Dharan (31)
const dharan = [
  { member: 'Dharan', amount: 44, category: 'Tea/Coffee', itemName: 'Matchbox,rava laddu,wave', place: 'NKL', date: '2026-08-01', time: '16:30', paymentMode: 'Cash', quantity: 5 },
  { member: 'Dharan', amount: 100, category: 'Fuel', itemName: 'NS200', place: 'PGP', date: '2026-08-01', time: '10:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 100, category: 'Food', itemName: 'Mushroom', place: 'TOLL', date: '2026-08-02', time: '19:30', paymentMode: 'Cash', quantity: 2 },
  { member: 'Dharan', amount: 20, category: 'Tea/Coffee', itemName: 'Tea', place: 'PMT', date: '2026-08-03', time: '17:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 60, category: 'Hans', itemName: 'Sanjai paid', place: 'HOME', date: '2026-08-03', time: '13:00', paymentMode: 'Friend Paid', quantity: 1 },
  { member: 'Dharan', amount: 400, category: 'Fuel', itemName: 'NS200', place: 'NKL', date: '2026-08-03', time: '10:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 10, category: 'Cigarette', itemName: 'Wave', place: 'PGP', date: '2026-08-05', time: '15:00', paymentMode: 'Friend Paid', quantity: 1 },
  { member: 'Dharan', amount: 120, category: 'Food', itemName: '-', place: '-', date: '2026-08-07', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 215, category: 'Alcohol', itemName: '-', place: '-', date: '2026-08-08', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 200, category: 'Fuel', itemName: '-', place: '-', date: '2026-08-09', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 20, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-10', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 177, category: 'Beverages', itemName: '-', place: '-', date: '2026-08-11', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 12, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-12', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 250, category: 'Alcohol', itemName: '-', place: '-', date: '2026-08-13', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 505, category: 'Others', itemName: '-', place: '-', date: '2026-08-14', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 55, category: 'Beverages', itemName: '-', place: '-', date: '2026-08-15', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 40, category: 'Beverages', itemName: '-', place: '-', date: '2026-08-16', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 20, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-17', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 120, category: 'Food', itemName: '-', place: '-', date: '2026-08-18', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 20, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-19', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 20, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-20', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 40, category: 'Tobacco Products', itemName: '-', place: '-', date: '2026-08-21', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 160, category: 'Snacks', itemName: '-', place: '-', date: '2026-08-22', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 150, category: 'Fuel', itemName: '-', place: '-', date: '2026-08-23', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 950, category: 'Others', itemName: '-', place: '-', date: '2026-08-25', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 100, category: 'Fuel', itemName: '-', place: '-', date: '2026-08-26', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 200, category: 'Others', itemName: '-', place: '-', date: '2026-08-27', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 150, category: 'Personal Care', itemName: '-', place: '-', date: '2026-08-28', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 350, category: 'Recharge', itemName: '-', place: '-', date: '2026-08-29', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 210, category: 'Beverages', itemName: '-', place: '-', date: '2026-08-30', time: '12:00', paymentMode: 'Cash', quantity: 1 },
  { member: 'Dharan', amount: 39, category: 'Recharge', itemName: '-', place: '-', date: '2026-08-31', time: '12:00', paymentMode: 'Cash', quantity: 1 }
];

// Sanjai correction: PDF has 84, but let us check if the first one is correct.
// PDF Sanjai #1: 2026-08-03 - Cigarette - Mint - 25 - UPI - NKL
// The current list has hist-aug26-sanjai-002 matching this. 
// I'll re-order Sanjai to match PDF numbering if possible.
const corrected_sanjai = sanjai.map((x, i) => ({ ...x, id: undefined, createdAt: undefined }));

const allExpenses = [...nimal, ...etti, ...dharan, ...corrected_sanjai];

let output = "import { Expense } from '../types';\n\nexport const AUGUST_2026_EXPENSES: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [\n";

allExpenses.forEach((exp, i) => {
  const line = `  { member: '${exp.member}', amount: ${exp.amount}, category: '${exp.category}', itemName: '${exp.itemName || '-'}', place: '${exp.place || '-'}', date: '${exp.date}', time: '${exp.time}', paymentMode: '${exp.paymentMode}', quantity: ${exp.quantity || 1} },`;
  output += line + "\n";
});

output += "];\n";

fs.writeFileSync('src/data/august2026Data.ts', output);
