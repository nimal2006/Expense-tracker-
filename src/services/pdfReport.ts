import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, MemberName } from '../types';
import { MEMBERS, normalizeCategoryName } from '../data/categories';
import { 
  calculateSummaryMetrics, 
  calculateWeeklySpending, 
  getTopSpendingItems, 
  formatCurrency, 
  formatExactCurrency,
  filterExpenses,
  sortExpensesDescending,
  formatDateDisplay
} from '../utils/analytics';

/**
 * Generates an executive-grade, beautifully formatted PDF report for monthly or all-time expenses.
 * Complies with strict A4 geometry, 16mm consistent margins, elegant KPI cards, repeating headers,
 * and high-contrast typographic hierarchy.
 */
export function generateMonthlyPdf(
  expenses: Expense[],
  monthStr: string,
  previousExpenses: Expense[] = [],
  targetMember?: MemberName | 'all'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isPersonal = !!targetMember && targetMember !== 'all';
  const displayMember = isPersonal ? targetMember : null;

  let periodTitle = monthStr;
  if (monthStr === 'all') {
    periodTitle = 'All-Time';
  } else {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(monthNumStr, 10) - 1] || monthStr;
    periodTitle = `${monthName} ${yearStr}`;
  }

  // Filter & Sort expenses descending chronologically
  const currentMonthExpenses = sortExpensesDescending(
    filterExpenses(
      expenses,
      monthStr,
      undefined,
      displayMember || 'All'
    )
  );

  const prevFilteredExpenses = filterExpenses(
    previousExpenses,
    undefined,
    undefined,
    displayMember || 'All'
  );

  const summary = calculateSummaryMetrics(currentMonthExpenses, prevFilteredExpenses);
  const topItems = getTopSpendingItems(currentMonthExpenses, 8);

  // Modern Slate & Indigo FinTech Color Palette
  const brandIndigo: [number, number, number] = [79, 70, 229];      // #4F46E5
  const brandIndigoDark: [number, number, number] = [67, 56, 202];  // #4338CA
  const brandIndigoLight: [number, number, number] = [238, 242, 255]; // #EEF2FF
  const slateDark: [number, number, number] = [15, 23, 42];         // #0F172A
  const slateHeader: [number, number, number] = [30, 41, 59];       // #1E293B
  const slateBody: [number, number, number] = [51, 65, 85];         // #334155
  const slateMuted: [number, number, number] = [100, 116, 139];     // #64748B
  const slateCardBg: [number, number, number] = [248, 250, 252];    // #F8FAFC
  const slateBorder: [number, number, number] = [226, 232, 240];    // #E2E8F0
  const emeraldAccent: [number, number, number] = [16, 185, 129];   // #10B981

  const pageWidth = 210;
  const marginX = 16;
  const contentWidth = pageWidth - (marginX * 2); // 178mm

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeFormatted = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const genTimestamp = `${dateFormatted}, ${timeFormatted}`;

  // =========================================================================
  // HELPER: RENDER TOP HEADER & BRANDING
  // =========================================================================
  const drawPageHeader = (pageNumber: number, titleOverride?: string) => {
    // 1. App Logo Badge
    doc.setFillColor(...brandIndigo);
    doc.roundedRect(marginX, 14, 9, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('₹', marginX + 2.8, 20.2);

    // 2. Title & Workspace
    doc.setTextColor(...slateDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(titleOverride || 'FRIENDS EXPENSE TRACKER', marginX + 12, 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMuted);
    doc.text(`Room Expense Report • Statement ID: FT-${monthStr.replace('-', '')}`, marginX + 12, 22.8);

    // 3. Right Badge & Period
    const badgeText = isPersonal ? 'PERSONAL STATEMENT' : 'OFFICIAL STATEMENT';
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    const badgeX = pageWidth - marginX - badgeWidth;

    doc.setFillColor(...brandIndigoLight);
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(badgeX, 13.5, badgeWidth, 5.5, 1.5, 1.5, 'FD');

    doc.setTextColor(...brandIndigoDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(badgeText, badgeX + 4, 17.3);

    doc.setTextColor(...slateDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(periodTitle, pageWidth - marginX, 23.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    const scopeLabel = isPersonal ? `Owner: ${displayMember}` : 'Scope: All 6 Roommates';
    doc.text(scopeLabel, pageWidth - marginX, 27.5, { align: 'right' });

    // 4. Accent Divider Line
    doc.setDrawColor(...brandIndigo);
    doc.setLineWidth(0.6);
    doc.line(marginX, 30.5, pageWidth - marginX, 30.5);
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE DASHBOARD & STATISTICAL OVERVIEW
  // =========================================================================
  drawPageHeader(1);

  // 1. Executive Summary KPI Cards (4-Column Grid)
  const cardY = 34.5;
  const cardHeight = 20;
  const cardGap = 2.6;
  const cardWidth = (contentWidth - (cardGap * 3)) / 4; // ~42.5mm

  const kpis = [
    {
      label: isPersonal ? 'PERSONAL SPEND' : 'TOTAL ROOM SPEND',
      value: formatExactCurrency(summary.totalExpense),
      sub: isPersonal ? `${displayMember}'s Total` : '6 Roommates Combined',
      color: brandIndigo
    },
    {
      label: isPersonal ? 'AVG DAILY SPEND' : (displayMember ? `${displayMember.toUpperCase()}’S SPEND` : 'NIMAL’S SPEND'),
      value: formatExactCurrency(
        isPersonal
          ? Math.round(summary.avgDailySpending)
          : (summary.memberTotals[displayMember || 'Nimal']?.amount || 0)
      ),
      sub: isPersonal
        ? 'Per day active'
        : `${summary.memberTotals[displayMember || 'Nimal']?.percentage || 0}% of room spend`,
      color: slateDark
    },
    {
      label: 'TRANSACTIONS',
      value: `${summary.totalTransactions}`,
      sub: `Avg ${formatCurrency(Math.round(summary.avgPerTransaction))} / txn`,
      color: slateDark
    },
    {
      label: 'TOP CATEGORY',
      value: summary.topCategory.category || 'N/A',
      sub: summary.topCategory.amount > 0 ? `${formatCurrency(summary.topCategory.amount)} (${summary.topCategory.percentage}%)` : 'No data',
      color: emeraldAccent
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = marginX + idx * (cardWidth + cardGap);
    
    // Background card box
    doc.setFillColor(...slateCardBg);
    doc.setDrawColor(...slateBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(kpi.label, x + 3.5, cardY + 4.8);

    // Value
    doc.setTextColor(...kpi.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    // Truncate long value strings safely if needed
    let valText = kpi.value;
    if (doc.getTextWidth(valText) > cardWidth - 7) {
      doc.setFontSize(8.5);
    }
    doc.text(valText, x + 3.5, cardY + 11.5);

    // Subtitle Note
    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(kpi.sub, x + 3.5, cardY + 16.5);
  });

  // 2. Member Breakdown / Personal Category Distribution Table
  const section1Y = cardY + cardHeight + 6;
  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(isPersonal ? `${displayMember}’s Category Distribution` : 'Roommate Contributions & Share', marginX, section1Y);

  const memberTableHead = isPersonal
    ? [['Category', 'Total Spent (₹)', 'Share (%)', 'Transactions', 'Avg / Txn']]
    : [['Member', 'Total Spent (₹)', 'Share (%)', 'Transactions', 'Avg / Txn']];

  const memberTableData = isPersonal
    ? summary.categoryArray.map(c => [
        c.category,
        formatExactCurrency(c.amount),
        `${c.percentage}%`,
        `${c.count}`,
        c.count > 0 ? formatExactCurrency(Math.round(c.amount / c.count)) : '₹0.00'
      ])
    : MEMBERS.map(member => {
        const data = summary.memberTotals[member.name] || { amount: 0, percentage: 0, count: 0 };
        return [
          member.name,
          formatExactCurrency(data.amount),
          `${data.percentage}%`,
          `${data.count}`,
          data.count > 0 ? formatExactCurrency(Math.round(data.amount / data.count)) : '₹0.00'
        ];
      });

  autoTable(doc, {
    startY: section1Y + 3,
    head: memberTableHead,
    body: memberTableData,
    theme: 'striped',
    headStyles: {
      fillColor: slateHeader,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 }
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
      textColor: slateBody,
      lineColor: slateBorder,
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: slateCardBg
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 46 },
      1: { halign: 'right', cellWidth: 36, fontStyle: 'bold', textColor: slateDark },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 38 }
    },
    margin: { left: marginX, right: marginX }
  });

  // 3. Category Spending Breakdown Table
  const finalY1 = (doc as any).lastAutoTable?.finalY || 105;
  const section2Y = finalY1 + 6;

  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Comprehensive Category Spending Breakdown', marginX, section2Y);

  const categoryTableData = summary.categoryArray.map((c, i) => [
    `#${i + 1}`,
    c.category,
    formatExactCurrency(c.amount),
    `${c.percentage}%`,
    `${c.count}`,
    formatExactCurrency(c.avgPerTxn)
  ]);

  autoTable(doc, {
    startY: section2Y + 3,
    head: [['#', 'Category', 'Total Spent (₹)', '% Share', 'Txns', 'Avg / Txn']],
    body: categoryTableData,
    theme: 'striped',
    headStyles: {
      fillColor: slateHeader,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 }
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
      textColor: slateBody,
      lineColor: slateBorder,
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: slateCardBg
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { halign: 'right', cellWidth: 34, fontStyle: 'bold', textColor: slateDark },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 38 }
    },
    margin: { left: marginX, right: marginX }
  });

  // 4. Payment Modes & Top Spends Mini Summary
  const finalY2 = (doc as any).lastAutoTable?.finalY || 180;
  
  if (finalY2 < 235) {
    const section3Y = finalY2 + 6;
    doc.setTextColor(...slateDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Payment Methods Summary', marginX, section3Y);

    const paymentRows = summary.paymentBreakdown.map(p => [
      p.mode,
      formatExactCurrency(p.amount),
      `${p.percentage}%`
    ]);

    autoTable(doc, {
      startY: section3Y + 3,
      head: [['Payment Mode', 'Total Amount (₹)', 'Distribution (%)']],
      body: paymentRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }
      },
      styles: {
        fontSize: 8,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        textColor: slateBody,
        lineColor: slateBorder
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold', textColor: slateDark },
        2: { cellWidth: 58, halign: 'center' }
      },
      margin: { left: marginX, right: marginX }
    });
  }

  // =========================================================================
  // PAGE 2+: DETAILED CHRONOLOGICAL TRANSACTIONS LEDGER TABLE
  // =========================================================================
  doc.addPage();
  drawPageHeader(2, isPersonal ? `${displayMember?.toUpperCase()}’S LEDGER` : 'TRANSACTION LEDGER');

  const ledgerTableHead = [['#', 'Date', 'Category', 'Item / Description', 'Paid By', 'Mode', 'Amount (₹)']];

  const ledgerTableRows = currentMonthExpenses.map((e, idx) => {
    const descParts: string[] = [];
    if (e.itemName) descParts.push(e.itemName);
    if (e.quantity && e.quantity > 1) descParts.push(`(Qty: ${e.quantity})`);
    if (e.place) descParts.push(`@ ${e.place}`);
    const fullDesc = descParts.length > 0 ? descParts.join(' ') : 'Standard Entry';

    return [
      `${idx + 1}`,
      formatDateDisplay(e.date),
      normalizeCategoryName(e.category),
      fullDesc,
      e.member,
      e.paymentMode,
      formatExactCurrency(e.amount)
    ];
  });

  // Append Total Summary Row
  ledgerTableRows.push([
    '',
    '',
    '',
    `Total Statement Amount (${currentMonthExpenses.length} Transactions)`,
    '',
    '',
    formatExactCurrency(summary.totalExpense)
  ]);

  autoTable(doc, {
    startY: 34,
    head: ledgerTableHead,
    body: ledgerTableRows,
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: slateHeader,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      valign: 'middle',
      cellPadding: { top: 3.2, bottom: 3.2, left: 2.5, right: 2.5 }
    },
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 },
      textColor: slateBody,
      lineColor: slateBorder,
      lineWidth: 0.1,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: slateCardBg
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: slateMuted },
      1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 26, fontStyle: 'bold' },
      3: { cellWidth: 54 },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: slateDark }
    },
    didParseCell: (data) => {
      // Highlight the subtotal row
      if (data.row.index === ledgerTableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        if (data.column.index === 3) {
          data.cell.styles.textColor = slateDark;
          data.cell.styles.fontSize = 8.5;
        }
        if (data.column.index === 6) {
          data.cell.styles.textColor = brandIndigo;
          data.cell.styles.fontSize = 9;
        }
      }
    },
    margin: { left: marginX, right: marginX, top: 34, bottom: 18 }
  });

  // =========================================================================
  // PAGE FOOTERS (DYNAMIC TOTAL PAGE COUNT ON ALL PAGES)
  // =========================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Bottom border separator
    doc.setDrawColor(...slateBorder);
    doc.setLineWidth(0.3);
    doc.line(marginX, 287, pageWidth - marginX, 287);

    // Left attribution
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text('Friends Tr$cker • Confidential Room Financial Statement', marginX, 291.5);

    // Right page number & timestamp
    const footerRight = `Page ${i} of ${totalPages}  •  ${genTimestamp}`;
    doc.text(footerRight, pageWidth - marginX, 291.5, { align: 'right' });
  }

  return doc;
}
