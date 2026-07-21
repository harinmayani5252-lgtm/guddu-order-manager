/* ==========================================================================
   pdf.js — professional order-sheet PDF using jsPDF + autoTable.
   Clean modern business layout (NOT a copy of the handwritten form).
   Exposes: PDFGen.build(order, settings) -> { blob, filename, dataUrl }
   ========================================================================== */
(function (global) {
  'use strict';

  var INDIGO = [79, 70, 229];
  var INK = [15, 18, 34];
  var GREY = [120, 126, 145];
  var LINE = [225, 228, 236];
  var SOFT = [238, 242, 255];

  function money(n) {
    if (n == null || isNaN(n)) return '';
    return Number(n).toLocaleString('en-IN');
  }
  function sanitize(s) { return String(s || '').replace(/[^a-z0-9]+/gi, '').slice(0, 24) || 'Customer'; }

  function build(order, settings, opts) {
    opts = opts || {};
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error('PDF library not loaded. Connect to the internet once so it can be cached for offline use.');
    }
    var jsPDF = global.jspdf.jsPDF;
    // A4 portrait, points — standard printable page size.
    var doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    var W = doc.internal.pageSize.getWidth();
    var M = 40; // margin
    var co = settings.company;

    /* ---------- Header band ---------- */
    doc.setFillColor.apply(doc, INDIGO);
    doc.rect(0, 0, W, 96, 'F');

    // real Guddu Group emblem (white PNG) — falls back gracefully if missing
    var textX = M;
    try {
      if (global.LOGO_PNG_WHITE) {
        var eh = 34, ew = eh * 1.53; // emblem aspect ratio
        doc.addImage(global.LOGO_PNG_WHITE, 'PNG', M, 30, ew, eh);
        textX = M + ew + 12;
      }
    } catch (e) { textX = M; }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(21);
    doc.text(co.name || 'ORDER FORM', textX, 44);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.setTextColor(226, 230, 255);
    doc.text((co.tagline || '').toUpperCase(), textX, 58);
    var addr = doc.splitTextToSize(co.address || '', 300);
    doc.text(addr, textX, 70);

    // right: contacts + ORDER FORM tag
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('ORDER FORM', W - M, 30, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(226, 230, 255);
    var cy = 44;
    (co.contacts || []).forEach(function (c) {
      doc.text(c.label + ': ' + c.phone, W - M, cy, { align: 'right' });
      cy += 11;
    });

    /* ---------- Order meta strip ---------- */
    var y = 116;
    doc.setTextColor.apply(doc, INK);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Order Sheet', M, y);

    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, GREY);
    doc.text('Order No.', W - M - 150, y - 8);
    doc.text('Order Date', W - M - 150, y + 8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, INK); doc.setFontSize(10);
    doc.text(order.order_number, W - M, y - 8, { align: 'right' });
    doc.text(formatDate(order.order_date), W - M, y + 8, { align: 'right' });

    y += 18;
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(1); doc.line(M, y, W - M, y);
    y += 18;

    /* ---------- Customer block ---------- */
    var c = order.customer || {};
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GREY);
    doc.text('BILL TO', M, y);
    doc.text('LOGISTICS', W / 2 + 10, y);
    y += 14;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, INK);
    doc.text(c.customer_name || '-', M, y);

    var leftPairs = [];
    if (c.mobile) leftPairs.push(['Mobile', c.mobile]);
    if (c.office_address) leftPairs.push(['Office', c.office_address]);
    if (c.delivery_address) leftPairs.push(['Delivery', c.delivery_address]);
    var rightPairs = [];
    if (c.transport_name) rightPairs.push(['Transport', c.transport_name]);
    if (c.broker_name) rightPairs.push(['Broker', c.broker_name]);
    if (c.broker_phone) rightPairs.push(['Broker Ph.', c.broker_phone]);

    var ry = y + 16, ly2 = y + 16;
    doc.setFontSize(9);
    function drawPairs(pairs, x, startY, colW) {
      var yy = startY;
      pairs.forEach(function (p) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GREY);
        doc.text(p[0], x, yy);
        doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, INK);
        var lines = doc.splitTextToSize(String(p[1]), colW - 62);
        doc.text(lines, x + 58, yy);
        yy += 13 * lines.length;
      });
      return yy;
    }
    var endL = drawPairs(leftPairs, M, ly2, W / 2 - M - 10);
    var endR = drawPairs(rightPairs, W / 2 + 10, ry, W / 2 - M - 10);
    y = Math.max(endL, endR) + 8;

    /* ---------- Items table ---------- */
    var hasRate = (order.items || []).some(function (it) { return it.rate != null && !isNaN(it.rate); });
    var head = hasRate
      ? [['#', 'Design No.', 'Pieces', 'Rate', 'Remarks']]
      : [['#', 'Design No.', 'Pieces', 'Remarks']];
    var body = (order.items || []).map(function (it, i) {
      return hasRate
        ? [i + 1, it.design_number || '', it.pieces == null ? '' : it.pieces, it.rate == null ? '' : money(it.rate), it.remarks || '']
        : [i + 1, it.design_number || '', it.pieces == null ? '' : it.pieces, it.remarks || ''];
    });

    doc.autoTable({
      startY: y,
      head: head,
      body: body,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, lineColor: LINE, lineWidth: 0.7, textColor: INK },
      headStyles: { fillColor: SOFT, textColor: INDIGO, fontStyle: 'bold', fontSize: 8.5, halign: 'left', lineColor: LINE },
      alternateRowStyles: { fillColor: [250, 250, 253] },
      columnStyles: hasRate ? {
        0: { cellWidth: 28, halign: 'center', textColor: GREY },
        2: { cellWidth: 55, halign: 'center' },
        3: { cellWidth: 70, halign: 'right' },
      } : {
        0: { cellWidth: 28, halign: 'center', textColor: GREY },
        2: { cellWidth: 60, halign: 'center' },
      },
    });

    var afterTable = doc.lastAutoTable.finalY + 16;

    /* ---------- Summary + notes ---------- */
    if (afterTable > doc.internal.pageSize.getHeight() - 150) { doc.addPage(); afterTable = 60; }

    var boxW = 200, boxX = W - M - boxW;
    doc.setFillColor.apply(doc, SOFT);
    doc.roundedRect(boxX, afterTable, boxW, 58, 8, 8, 'F');
    doc.setFontSize(9); doc.setTextColor.apply(doc, GREY); doc.setFont('helvetica', 'bold');
    doc.text('Total Designs', boxX + 14, afterTable + 22);
    doc.text('Total Pieces', boxX + 14, afterTable + 42);
    doc.setFontSize(13); doc.setTextColor.apply(doc, INDIGO);
    doc.text(String(order.total_designs || 0), boxX + boxW - 14, afterTable + 23, { align: 'right' });
    doc.text(String(order.total_pieces || 0), boxX + boxW - 14, afterTable + 43, { align: 'right' });

    // notes / payment on the left
    var lx2 = M;
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, GREY);
    doc.text('PAYMENT TERMS', lx2, afterTable + 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor.apply(doc, INK);
    doc.text(order.payment_terms || '-', lx2, afterTable + 28);
    if (order.notes) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GREY);
      doc.text('NOTES', lx2, afterTable + 46);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, INK);
      var noteLines = doc.splitTextToSize(order.notes, boxX - M - 20);
      doc.text(noteLines, lx2, afterTable + 58);
    }

    /* ---------- Footer (every page) ---------- */
    var pages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
      doc.setPage(p);
      var H = doc.internal.pageSize.getHeight();
      doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.7);
      doc.line(M, H - 58, W - M, H - 58);
      // signature area
      doc.setFontSize(8.5); doc.setTextColor.apply(doc, GREY); doc.setFont('helvetica', 'normal');
      doc.text('Generated by: ' + (order.created_by || '-'), M, H - 42);
      doc.text('Generated on: ' + formatDateTime(order.created_at), M, H - 30);
      doc.text('For, ' + (co.name || ''), W - M, H - 42, { align: 'right' });
      doc.setDrawColor.apply(doc, GREY); doc.line(W - M - 120, H - 26, W - M, H - 26);
      doc.text('Authorised Signature', W - M, H - 18, { align: 'right' });
      // brand credit
      doc.setFontSize(7.5); doc.setTextColor.apply(doc, GREY);
      doc.text('Guddu Order Manager  •  Created by Keval Mayani', M, H - 16);
      doc.text('Page ' + p + ' / ' + pages, W / 2, H - 16, { align: 'center' });
    }

    // Embed an auto-print action so the print dialog can open on view.
    if (opts.print) { try { doc.autoPrint(); } catch (e) {} }

    var filename = sanitize(c.customer_name) + '_' + order.order_number + '_' + order.order_date + '.pdf';
    var blob = doc.output('blob');
    var dataUrl = doc.output('datauristring');
    return { blob: blob, filename: filename, dataUrl: dataUrl, doc: doc };
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return parts[2] + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
  }
  function formatDateTime(ts) {
    if (!ts) return '-';
    var d = new Date(ts);
    return formatDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) +
      ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  global.PDFGen = { build: build, formatDate: formatDate, sanitize: sanitize };
})(window);
