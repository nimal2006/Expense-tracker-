import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { calculateSummaryMetrics, calculateWeeklySpending, getTopSpendingItems, formatCurrency } from '../utils/analytics';

export function generateMonthlyPdf(expenses: Expense[], monthStr: string, previousExpenses: Expense[] = []): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const [yearStr, monthNumStr] = monthStr.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parseInt(monthNumStr, 10) - 1] || monthStr;
  const periodTitle = `${monthName} ${yearStr}`;

  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
  const summary = calculateSummaryMetrics(currentMonthExpenses, previousExpenses);
  const weekly = calculateWeeklySpending(currentMonthExpenses, monthStr);
  const topItems = getTopSpendingItems(currentMonthExpenses, 10);

  // Color Palette
  const brandIndigo: [number, number, number] = [79, 70, 229]; // indigo-600
  const slateDark: [number, number, number] = [30, 41, 59]; // slate-800

  // Member distinct RGB colors for section badges
  const memberRgbMap: Record<MemberName, [number, number, number]> = {
    Nimal: [79, 70, 229],     // Indigo
    Etti: [16, 185, 129],     // Emerald
    Dharan: [217, 119, 6],    // Amber
    Sanjai: [37, 99, 235],    // Blue
    Santhosh: [139, 92, 246]  // Purple/Violet
  };

  // ==========================================
  // PAGE 1: Executive Summary & Core Metrics
  // ==========================================
  
  // 1. Header Banner
  doc.setFillColor(...brandIndigo);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FRIENDS EXPENSE TRACKER', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Monthly Expense Report — ${periodTitle}`, 140, 15);

  // 2. Overview Summary Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 34);

  // Summary Metrics Table
  const summaryRows = [
    [
      { content: 'Total Expense', styles: { fontStyle: 'bold' as const } },
      formatCurrency(summary.totalExpense),
      { content: 'Total Transactions', styles: { fontStyle: 'bold' as const } },
      `${summary.totalTransactions}`
    ],
    [
      { content: 'Avg Daily Spend', styles: { fontStyle: 'bold' as const } },
      formatCurrency(Math.round(summary.avgDailySpending)),
      { content: 'Avg / Transaction', styles: { fontStyle: 'bold' as const } },
      formatCurrency(Math.round(summary.avgPerTransaction))
    ],
    [
      { content: 'Top Category', styles: { fontStyle: 'bold' as const } },
      `${summary.topCategory.category} (${summary.topCategory.percentage}%)`,
      { content: 'Top Payment Mode', styles: { fontStyle: 'bold' as const } },
      summary.paymentBreakdown[0] ? `${summary.paymentBreakdown[0].mode} (${summary.paymentBreakdown[0].percentage}%)` : 'N/A'
    ]
  ];

  autoTable(doc, {
    startY: 38,
    head: [],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fillColor: [248, 250, 252], fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 57 },
      2: { fillColor: [248, 250, 252], fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 45 }
    }
  });

  // 3. Member Spending Breakdown Table
  const finalY1 = (doc as any).lastAutoTable.finalY || 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Member Contributions & Distribution', 14, finalY1 + 8);

  const memberTableData = MEMBERS.map(member => {
    const data = summary.memberTotals[member.name] || { amount: 0, percentage: 0, count: 0 };
    return [
      member.name,
      formatCurrency(data.amount),
      `${data.percentage}%`,
      `${data.count}`,
      data.count > 0 ? formatCurrency(Math.round(data.amount / data.count)) : '₹0'
    ];
  });

  autoTable(doc, {
    startY: finalY1 + 12,
    head: [['Member', 'Total Spent', '% of Group', 'Transactions', 'Avg / Txn']],
    body: memberTableData,
    theme: 'striped',
    headStyles: { fillColor: brandIndigo, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // 4. Category Breakdown Table
  const finalY2 = (doc as any).lastAutoTable.finalY || 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Category Spending Breakdown', 14, finalY2 + 8);

  const categoryTableData = summary.categoryArray.map((c, i) => [
    `#${i + 1}`,
    c.category,
    formatCurrency(c.amount),
    `${c.percentage}%`,
    `${c.count}`,
    formatCurrency(c.avgPerTxn)
  ]);

  autoTable(doc, {
    startY: finalY2 + 12,
    head: [['#', 'Category', 'Amount', '% Total', 'Txns', 'Avg / Txn']],
    body: categoryTableData,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 }
  });

  // ==========================================
  // PAGE 2: Top Items & Spending Patterns
  // ==========================================
  const finalY3 = (doc as any).lastAutoTable.finalY || 180;
  if (finalY3 > 215) {
    doc.addPage();
  }

  const currentY = (doc as any).lastAutoTable.finalY > 215 ? 15 : finalY3 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Top 10 Spending Items This Month', 14, currentY);

  const topItemsTableData = topItems.map((item, idx) => [
    `#${idx + 1}`,
    item.date,
    item.member,
    item.itemName || '—',
    item.category,
    item.paymentMode,
    formatCurrency(item.amount)
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['#', 'Date', 'Member', 'Item / Details', 'Category', 'Mode', 'Amount']],
    body: topItemsTableData,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 }
  });

  // Payment Methods Breakdown Box on Page 2
  const finalYTopItems = (doc as any).lastAutoTable.finalY || 130;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Payment Methods Summary', 14, finalYTopItems + 8);

  const paymentTableData = summary.paymentBreakdown.map(p => [
    p.mode,
    formatCurrency(p.amount),
    `${p.percentage}%`
  ]);

  autoTable(doc, {
    startY: finalYTopItems + 12,
    head: [['Payment Method', 'Total Spent', 'Share of Total']],
    body: paymentTableData,
    theme: 'grid',
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.2 }
  });

  // =========================================================================
  // PAGE 3+: Classified Member Transaction Ledgers (Organized by Person)
  // =========================================================================
  doc.addPage();
  
  // Section Master Banner
  doc.setFillColor(...brandIndigo);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Classified Member Transaction Ledgers — ${periodTitle}`, 14, 11);

  let currentSectionY = 24;

  MEMBERS.forEach((member) => {
    // Filter this member's expenses and sort chronologically by date
    const memberExpenses = currentMonthExpenses
      .filter(e => e.member === member.name)
      .sort((a, b) => a.date.localeCompare(b.date));

    const memberTotal = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
    const memberPercent = summary.totalExpense > 0 
      ? Math.round((memberTotal / summary.totalExpense) * 100) 
      : 0;

    // Check if we need a new page for this member's section header
    if (currentSectionY > 235) {
      doc.addPage();
      currentSectionY = 16;
    }

    const memberColor = memberRgbMap[member.name] || brandIndigo;

    // Draw member badge & section header bar
    doc.setFillColor(...memberColor);
    doc.roundedRect(14, currentSectionY, 182, 9, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(
      `${member.name.toUpperCase()}’S LEDGER`,
      18,
      currentSectionY + 6.2
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `${memberExpenses.length} Txns  •  Total: ${formatCurrency(memberTotal)} (${memberPercent}% of Group)`,
      192,
      currentSectionY + 6.2,
      { align: 'right' }
    );

    if (memberExpenses.length === 0) {
      // Empty state for this member
      currentSectionY += 13;
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text(`No recorded expenses for ${member.name} in ${periodTitle}.`, 18, currentSectionY);
      currentSectionY += 8;
    } else {
      // Table of this member's transactions
      const memberRows: (string | number)[][] = memberExpenses.map((e, idx) => [
        `${idx + 1}`,
        e.date,
        e.category,
        e.itemName || '—',
        e.quantity && e.quantity > 1 ? `${e.quantity}` : '1',
        e.paymentMode,
        e.place || '—',
        formatCurrency(e.amount)
      ]);

      // Add subtotal as regular row with distinct styling
      memberRows.push([
        '',
        '',
        '',
        `Total Spent by ${member.name}`,
        '',
        '',
        '',
        formatCurrency(memberTotal)
      ]);

      autoTable(doc, {
        startY: currentSectionY + 11,
        head: [['#', 'Date', 'Category', 'Item / Description', 'Qty', 'Payment', 'Place / Store', 'Amount']],
        body: memberRows,
        theme: 'grid',
        headStyles: {
          fillColor: memberColor,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 20 },
          2: { cellWidth: 26 },
          3: { cellWidth: 42 },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 22 },
          6: { cellWidth: 28 },
          7: { cellWidth: 24, halign: 'right' }
        },
        didParseCell: (data) => {
          // Style the subtotal row
          if (data.row.index === memberRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            if (data.column.index === 7) {
              data.cell.styles.textColor = memberColor;
            }
          }
        },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: slateDark },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      currentSectionY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  // ==========================================
  // Page Numbers Footer on All Pages
  // ==========================================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Friends Expense Tracker • Page ${i} of ${pageCount} • Generated on ${new Date().toLocaleDateString('en-IN')}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

