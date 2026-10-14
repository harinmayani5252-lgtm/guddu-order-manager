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

  // load matched design photos as dataURLs (async, best-effort)
  function loadDesignImages(order) {
    if (!global.Designs || !global.Designs.forOrder) return Promise.resolve([]);
    var wanted = global.Designs.forOrder(order);
    return Promise.all(wanted.map(function (d) {
      return fetch(d.url).then(function (r) { return r.blob(); }).then(function (blob) {
        return new Promise(function (resolve) {
          var fr = new FileReader();
          fr.onload = function () {
            var img = new Image();
            img.onload = function () { resolve({ design_number: d.design_number, dataUrl: fr.result, w: img.width, h: img.height }); };
            img.onerror = function () { resolve(null); };
            img.src = fr.result;
          };
          fr.onerror = function () { resolve(null); };
          fr.readAsDataURL(blob);
        });
      }).catch(function () { return null; });
    })).then(function (arr) { return arr.filter(Boolean); });
  }

  async function build(order, settings, opts) {
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
    doc.rect(0, 0, W, 102, 'F');

    // real Guddu Group emblem (white PNG) — falls back gracefully if missing
    var textX = M;
    try {
      if (global.LOGO_PNG_WHITE) {
        var eh = 36, ew = eh * 1.53; // emblem aspect ratio
        doc.addImage(global.LOGO_PNG_WHITE, 'PNG', M, 30, ew, eh);
        textX = M + ew + 12;
      }
    } catch (e) { textX = M; }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text(co.name || 'GUDDU FASHION PRIVATE LIMITED', textX, 40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(240, 243, 255);
    var gstNo = co.gst || '24AACCG3656K1ZJ';
    doc.text('GSTIN: ' + gstNo, textX, 52);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(226, 230, 255);
    doc.text((co.tagline || '').toUpperCase(), textX, 63);
    var addr = doc.splitTextToSize(co.address || '', 280);
    doc.text(addr, textX, 74);

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
    var y = 122;
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
    var hasSets = (order.items || []).some(function (it) { return it.sets != null && !isNaN(it.sets) && String(it.sets).trim() !== ''; }) || (order.total_sets && order.total_sets > 0);
    var head = hasRate
      ? [['#', 'Design No.', 'Pieces', 'Set', 'Rate', 'Remarks']]
      : [['#', 'Design No.', 'Pieces', 'Set', 'Remarks']];
    var body = (order.items || []).map(function (it, i) {
      return hasRate
        ? [i + 1, it.design_number || '', it.pieces == null ? '' : it.pieces, it.sets == null ? '' : it.sets, it.rate == null ? '' : money(it.rate), it.remarks || '']
        : [i + 1, it.design_number || '', it.pieces == null ? '' : it.pieces, it.sets == null ? '' : it.sets, it.remarks || ''];
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
        2: { cellWidth: 50, halign: 'center' },
        3: { cellWidth: 45, halign: 'center' },
        4: { cellWidth: 65, halign: 'right' },
      } : {
        0: { cellWidth: 28, halign: 'center', textColor: GREY },
        2: { cellWidth: 55, halign: 'center' },
        3: { cellWidth: 50, halign: 'center' },
      },
    });

    var afterTable = doc.lastAutoTable.finalY + 16;

    /* ---------- Summary + notes ---------- */
    if (afterTable > doc.internal.pageSize.getHeight() - 150) { doc.addPage(); afterTable = 60; }

    var boxW = 200, boxX = W - M - boxW;
    var boxH = hasSets ? 74 : 58;
    doc.setFillColor.apply(doc, SOFT);
    doc.roundedRect(boxX, afterTable, boxW, boxH, 8, 8, 'F');
    doc.setFontSize(9); doc.setTextColor.apply(doc, GREY); doc.setFont('helvetica', 'bold');
    doc.text('Total Designs', boxX + 14, afterTable + 20);
    doc.text('Total Pieces', boxX + 14, afterTable + 38);
    if (hasSets) {
      doc.text('Total Sets', boxX + 14, afterTable + 56);
    }
    doc.setFontSize(13); doc.setTextColor.apply(doc, INDIGO);
    doc.text(String(order.total_designs || 0), boxX + boxW - 14, afterTable + 21, { align: 'right' });
    doc.text(String(order.total_pieces || 0), boxX + boxW - 14, afterTable + 39, { align: 'right' });
    if (hasSets) {
      doc.text(String(order.total_sets || 0), boxX + boxW - 14, afterTable + 57, { align: 'right' });
    }

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

    /* ---------- Design Reference photos (last page) ---------- */
    var designImgs = [];
    if (opts.includeDesigns !== false) {
      try { designImgs = await loadDesignImages(order); } catch (e) { designImgs = []; }
    }
    if (designImgs.length) {
      var H0 = doc.internal.pageSize.getHeight();
      doc.addPage();
      var dy = 56;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor.apply(doc, INK);
      doc.text('Design Reference', M, dy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GREY);
      doc.text('Photos of the designs on this order — for confirmation.', M, dy + 14);
      dy += 30;

      var cols = 3, gap = 16;
      var cellW = (W - 2 * M - gap * (cols - 1)) / cols;
      var imgH = cellW * 1.15; // photo box height
      var cellH = imgH + 20;   // + label
      var col = 0, x = M;
      designImgs.forEach(function (d) {
        if (dy + cellH > H0 - 70) { doc.addPage(); dy = 56; col = 0; x = M; }
        x = M + col * (cellW + gap);
        // frame
        doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.8);
        doc.setFillColor(250, 250, 253);
        doc.roundedRect(x, dy, cellW, imgH, 6, 6, 'FD');
        // fit image preserving aspect
        var ar = d.w / d.h;
        var bw = cellW - 12, bh = imgH - 12;
        var iw = bw, ih = bw / ar;
        if (ih > bh) { ih = bh; iw = bh * ar; }
        try { doc.addImage(d.dataUrl, 'JPEG', x + (cellW - iw) / 2, dy + (imgH - ih) / 2, iw, ih); } catch (e) {}
        // label
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor.apply(doc, INK);
        doc.text(String(d.design_number), x + cellW / 2, dy + imgH + 13, { align: 'center', maxWidth: cellW });
        col++;
        if (col >= cols) { col = 0; dy += cellH + 6; }
      });
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
