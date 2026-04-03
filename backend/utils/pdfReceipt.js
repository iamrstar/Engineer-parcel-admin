const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

/**
 * Compact Single-Receipt PDF Generator for Engineers Parcel.
 * Optimized for top-alignment with restored Date/No and complete Destination.
 */
async function generateReceiptPDF(booking) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
            oblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        };

        const margin = 30;
        const startX = margin;
        const endX = width - margin;
        const tableWidth = endX - startX;
        const midX = startX + tableWidth / 2;

        const black = rgb(0, 0, 0);
        const red = rgb(0.8, 0.1, 0.1);
        const darkGray = rgb(0.2, 0.2, 0.2);
        const headerBg = rgb(0.94, 0.96, 1.0);

        let globalY = height - 20;
        const sectionTop = globalY;

        const drawCell = (text, x, yTop, boxW, boxH, font, size, align = 'left', color = black) => {
            const tx = String(text || '');
            const tw = font.widthOfTextAtSize(tx, size);
            const th = font.sizeAtHeight(size);
            let px = x + 6;
            if (align === 'center') px = x + (boxW / 2) - (tw / 2);
            if (align === 'right') px = x + boxW - tw - 6;
            let py = yTop - (boxH / 2) - (th / 2) + 2;
            page.drawText(tx, { x: px, y: py, size, font, color });
        };

        const drawHLine = (yPos, start = startX, end = endX) => page.drawLine({ start: { x: start, y: yPos }, end: { x: end, y: yPos }, thickness: 0.6, color: black });
        const drawVLine = (xPos, yTop, yBot) => page.drawLine({ start: { x: xPos, y: yTop }, end: { x: xPos, y: yBot }, thickness: 0.6, color: black });

        const wrapText = (text, x, y, maxW, font, size) => {
            const words = String(text || '').split(' ');
            let line = '';
            let cy = y;
            for (const w of words) {
                const tl = line + w + ' ';
                if (font.widthOfTextAtSize(tl, size) > maxW) {
                    page.drawText(line.trim(), { x, y: cy, size, font });
                    line = w + ' ';
                    cy -= (size + 2.5);
                } else {
                    line = tl;
                }
            }
            page.drawText(line.trim(), { x, y: cy, size, font });
            return cy;
        };

        // --- 1. EDL Banner ---
        const isEdl = booking.edl > 0 || booking.packageDetails?.isEdl || (booking.packageDetails?.description && booking.packageDetails.description.toUpperCase().includes('EDL'));
        if (isEdl) {
            const h = 18;
            const ey = globalY - h;
            page.drawRectangle({ x: startX, y: ey, width: tableWidth, height: h, color: rgb(1, 0.97, 0.94) });
            drawCell(`!!! EXTRA DELIVERY LOCATION (EDL) AREA !!!`, startX, globalY, tableWidth, h, fonts.bold, 8.5, 'center', red);
            drawHLine(ey);
            globalY = ey;
        }

        // --- 2. Header Branding ---
        const bH = 65;
        const bY = globalY - bH;
        try {
            const lp = path.join(__dirname, '..', 'public', 'logo.png');
            if (fs.existsSync(lp)) {
                const li = await pdfDoc.embedPng(fs.readFileSync(lp));
                const ld = li.scaleToFit(110, 50);
                page.drawImage(li, { x: startX + 10, y: bY + (bH / 2) - (ld.height / 2), width: ld.width, height: ld.height });
            }
        } catch (e) { }

        const adds = [
            'SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED',
            'IIT (ISM) Dhanbad - 826004, Jharkhand, India',
            'Contact: 9708815717 / 9525801506',
            'Email: info@engineersparcel.in | Website: www.engineersparcel.in'
        ];
        let ly = globalY;
        for (let i = 0; i < adds.length; i++) {
            drawCell(adds[i], midX - 30, ly, endX - (midX - 30), bH / 4, i === 0 ? fonts.bold : fonts.regular, i === 0 ? 8 : 7, 'left');
            ly -= (bH / 4);
        }
        drawVLine(midX - 30, globalY, bY);
        drawHLine(bY);
        globalY = bY;

        // --- 3. Tracking ID Bar ---
        const r2H = 22;
        const r2Y = globalY - r2H;
        const tid = booking.trackingId || booking.bookingId || 'EP-PENDING';
        page.drawRectangle({ x: startX, y: r2Y, width: tableWidth, height: r2H, color: headerBg });
        drawCell('BOOKING E-RECEIPT', startX, globalY, midX - startX, r2H, fonts.bold, 11, 'center');
        drawCell(`TRACKING ID: ${tid}`, midX, globalY, endX - midX, r2H, fonts.bold, 9, 'center');
        drawVLine(midX, globalY, r2Y);
        drawHLine(r2Y);
        globalY = r2Y;

        // --- 4. DATE & RECEIPT NO (RESTORED) ---
        const r3H = 18;
        const r3Y = globalY - r3H;
        const resDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
        drawCell(`Receipt Date: ${resDate}`, startX, globalY, midX - startX, r3H, fonts.regular, 8.5);
        drawCell(`Receipt No: EP/${new Date().getFullYear()}/${tid.split('-').pop()}`, midX, globalY, endX - midX, r3H, fonts.regular, 8.5);
        drawVLine(midX, globalY, r3Y);
        drawHLine(r3Y);
        globalY = r3Y;

        // --- 5. DETAILS SECTION ---
        const dhH = 16;
        const dhY = globalY - dhH;
        page.drawRectangle({ x: startX, y: dhY, width: tableWidth, height: dhH, color: headerBg });
        drawCell(' SENDER DETAILS ', startX, globalY, midX - startX, dhH, fonts.bold, 8);
        drawCell('RECEIVER DETAILS ', midX, globalY, endX - midX, dhH, fonts.bold, 8);
        drawVLine(midX, globalY, dhY);
        drawHLine(dhY);
        globalY = dhY;

        const startDetY = globalY;
        const renderCol = (det, x) => {
            let y = startDetY - 12;
            const sz = 8;
            const drawF = (l, v) => {
                page.drawText(`${l}:`, { x: x + 8, y, size: sz, font: fonts.bold });
                const dy = wrapText(v || 'N/A', x + 60, y, (midX - startX) - 70, fonts.regular, sz);
                y = dy - 11;
            };
            drawF('Name', det?.name);
            drawF('Phone', det?.phone);
            let a = det?.address || '';
            if (det?.address1) a = `${det.address1}, ${det.address2 || ''}`.trim();
            if (det?.landmark) a += ` (${det.landmark})`;
            drawF('Address', a);
            drawF('Destination', `${det?.city || 'N/A'}, ${det?.state || ''} - ${det?.pincode || ''}`);
            return y;
        };

        const yS = renderCol(booking.senderDetails, startX);
        const yR = renderCol(booking.receiverDetails, midX);
        const detBot = Math.min(yS, yR, startDetY - 60) - 5;
        drawVLine(midX, startDetY, detBot);
        drawHLine(detBot);
        globalY = detBot;

        // --- 6. Item Table Header ---
        const itH = 18;
        const itY = globalY - itH;
        page.drawRectangle({ x: startX, y: itY, width: tableWidth, height: itH, color: headerBg });
        const cols = [{ l: 'Sno.', w: 30 }, { l: 'Description of Goods', w: 180 }, { l: 'Qty', w: 40 }, { l: 'Weight', w: 80 }, { l: 'Dimensions', w: tableWidth - 330 }];
        let cx = startX;
        cols.forEach((c, i) => {
            drawCell(c.l, cx, globalY, c.w, itH, fonts.bold, 8, 'center');
            cx += c.w;
            if (i < cols.length - 1) drawVLine(cx, globalY, itY);
        });
        drawHLine(itY);
        globalY = itY;

        // --- 7. Item Content (Dynamic) ---
        const startItemY = globalY - 12;
        const descText = [booking.packageDetails?.description, booking.notes].filter(Boolean).join(' | ') || 'Shipment Content';
        const lastDescY = wrapText(descText, startX + 35, startItemY, 170, fonts.regular, 7.5);

        const rowBot = Math.min(lastDescY, startItemY - 20) - 8;
        const r7H = globalY - rowBot;

        drawCell('1', startX, globalY, 30, r7H, fonts.regular, 8, 'center');
        drawCell(String(booking.packageDetails?.boxQuantity || 1), startX + 210, globalY, 40, r7H, fonts.regular, 8, 'center');
        drawCell(`${booking.packageDetails?.weight || 0}${booking.packageDetails?.weightUnit || 'kg'}`, startX + 250, globalY, 80, r7H, fonts.bold, 8, 'center');

        const dims = booking.packageDetails?.dimensions || [];
        let ds = 'N/A';
        if (dims.length > 0) {
            ds = Array.isArray(dims) ? dims.map(d => `${d.length}x${d.width}x${d.height}`).join(', ') : `${dims.length}x${dims.width}x${dims.height}`;
            if (ds.length > 30) ds = ds.substring(0, 27) + '...';
        }
        drawCell(ds, startX + 330, globalY, tableWidth - 330, r7H, fonts.regular, 7.5, 'center');

        cx = startX;
        cols.forEach(c => { cx += c.w; if (cx < endX) drawVLine(cx, globalY, rowBot); });
        drawHLine(rowBot);
        globalY = rowBot;

        // --- 8. Pricing & Service Section ---
        const pH = 55;
        const pY = globalY - pH;
        const subT = (booking.pricing?.basePrice || 0) + (booking.pricing?.packagingCharge || 0);
        drawCell(`SERVICE: ${(booking.serviceType || 'STD').toUpperCase()}`, startX, globalY, 200, 18, fonts.bold, 8);
        drawCell(`STATUS: ${booking.paymentStatus?.toUpperCase() || 'UNPAID'}`, startX, globalY - 18, 200, 18, fonts.regular, 7.5);
        drawCell(`DELIVERY: ${booking.estimatedDelivery || '3-5 Days'}`, startX, globalY - 36, 200, 18, fonts.oblique, 7.5);

        const pX1 = endX - 160;
        const pX2 = endX - 80;
        const lines = [
            { l: 'Sub Total', v: `Rs.${subT.toFixed(2)}` },
            { l: 'Tax/GST', v: `Rs.${(booking.pricing?.tax || 0).toFixed(2)}` },
            { l: 'TOTAL', v: `Rs.${(booking.pricing?.totalAmount || 0).toFixed(2)}` }
        ];
        for (let i = 0; i < 3; i++) {
            const y = globalY - (i * 18);
            drawCell(lines[i].l, pX1, y, 80, 18, i === 2 ? fonts.bold : fonts.regular, 7.5, 'right');
            drawCell(lines[i].v, pX2, y, 80, 18, i === 2 ? fonts.bold : fonts.regular, 8.5, 'center');
            drawVLine(pX1, globalY, pY);
            drawVLine(pX2, globalY, pY);
            if (i < 2) drawHLine(y - 18, pX1, endX);
        }
        drawHLine(pY);
        globalY = pY;

        // --- 9. SIGNATURES ---
        const sH = 60;
        const sY = globalY - sH;
        page.drawLine({ start: { x: startX + 20, y: sY + 20 }, end: { x: startX + 140, y: sY + 20 }, thickness: 0.5, color: black });
        drawCell('Consignor Signature', startX + 20, sY + 8, 120, 12, fonts.oblique, 7.5, 'center');

        try {
            const sp = path.join(__dirname, '..', 'public', 'signature.png');
            if (fs.existsSync(sp)) {
                const si = await pdfDoc.embedPng(fs.readFileSync(sp));
                const sd = si.scaleToFit(80, 30);
                page.drawImage(si, { x: endX - 120, y: sY + 25, width: sd.width, height: sd.height });
            }
        } catch (e) { }
        page.drawLine({ start: { x: endX - 140, y: sY + 20 }, end: { x: endX - 20, y: sY + 20 }, thickness: 0.5, color: black });
        drawCell('Authorized Signatory', endX - 140, sY + 8, 120, 12, fonts.oblique, 7.5, 'center');

        drawHLine(sY);
        globalY = sY;

        // --- 10. PAYMENT SECTION (QR & BANK) ---
        if (booking.paymentStatus?.toLowerCase() === 'pending') {
            const payYStart = globalY;
            const payFontSize = 7.5;
            const colW = tableWidth / 2;

            // Bank Details (Left side)
            const bX = startX + 10;
            page.drawText("BANK TRANSFER DETAILS", { x: bX, y: globalY - 12, size: 8, font: fonts.bold });

            const bankLines = [
                `Name: SRQ ENGINEERS PARCEL AND HAUL PVT LTD`,
                `A/c No: 01910210001448 (CAA)`,
                `IFSC: UCBA0000191`,
                `Branch: HIRAPUR-DHANBAD`
            ];

            bankLines.forEach((line, i) => {
                page.drawText(line, { x: bX, y: globalY - 24 - (i * 10), size: payFontSize, font: fonts.regular });
            });

            const lowestBankY = globalY - 24 - (bankLines.length * 10);

            // QR Code (Right side)
            let lowestQrY = globalY;
            if (booking.paymentLink) {
                try {
                    const qrCodeDataUrl = await QRCode.toDataURL(booking.paymentLink, {
                        margin: 1,
                        width: 100,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                    const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
                    const qrImage = await pdfDoc.embedPng(qrImageBytes);
                    const qrScale = qrImage.scale(0.55);

                    const qrX = endX - qrScale.width - 25;
                    const qrY = globalY - qrScale.height - 10;

                    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrScale.width, height: qrScale.height });
                    drawCell("Scan to Pay (via upi)", qrX, qrY - 2, qrScale.width, 10, fonts.bold, 7, 'center');
                    lowestQrY = qrY - 12;
                } catch (qrErr) {
                    console.error("QR Code Generation Error:", qrErr);
                }
            }

            globalY = Math.min(lowestBankY, lowestQrY) - 10;
        }

        // OUTER BORDER
        page.drawRectangle({
            x: startX, y: globalY, width: tableWidth, height: sectionTop - globalY,
            borderWidth: 1, borderColor: black,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("PDF Generate Error:", error);
        throw error;
    }
}

module.exports = { generateReceiptPDF };
