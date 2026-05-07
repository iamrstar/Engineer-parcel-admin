const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

// ─── Simple In-Memory Cache for Assets ───
const assetCache = {
    logo: null,
    signature: null,
    failedAttempts: new Set()
};

/**
 * Sanitizer to prevent WinAnsi encoding errors (like tabs 0x0009 or emojis)
 * Crucial for pdf-lib which uses standard WinAnsi fonts by default.
 */
const clean = (str) => {
    if (typeof str !== 'string') return String(str || '');
    // Replace tabs with space and remove non-printable/non-WinAnsi characters
    return str.replace(/\t/g, ' ').replace(/[^\x20-\x7E]/g, '');
};

const getAsset = (name, filePath) => {
    if (assetCache[name]) return assetCache[name];
    if (assetCache.failedAttempts.has(name)) return null;

    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            assetCache[name] = data;
            console.log(`✅ Loaded asset into cache: ${name}`);
            return data;
        }
    } catch (err) {
        console.error(`❌ Failed to load asset ${name}:`, err.message);
        assetCache.failedAttempts.add(name);
    }
    return null;
};

/**
 * Parses items string (e.g. "Alpha Box x2, Nova Box x1") into an array of individual items.
 */
function parseItems(itemsStr, totalCount) {
    if (!itemsStr) return Array(totalCount || 1).fill("Standard Box");

    const parts = itemsStr.split(',').map(p => p.trim());
    const expanded = [];

    parts.forEach(part => {
        const match = part.match(/(.+) x(\d+)/i);
        if (match) {
            const name = match[1].trim();
            const count = parseInt(match[2], 10);
            for (let i = 0; i < count; i++) expanded.push(name);
        } else {
            expanded.push(part);
        }
    });

    // If parsing produced fewer items than totalCount, fill the rest
    if (totalCount && expanded.length < totalCount) {
        const fallback = parts[0] ? parts[0].replace(/ x\d+/i, '').trim() : "Standard Box";
        while (expanded.length < totalCount) {
            expanded.push(fallback);
        }
    }

    return expanded.length > 0 ? expanded : ["Standard Box"];
}

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
        const headerBg = rgb(0.94, 0.96, 1.0);

        let globalY = height - 20;
        const sectionTop = globalY;

        const drawCell = (text, x, yTop, boxW, boxH, font, size, align = 'left', color = black) => {
            const tx = clean(text);
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
            const words = clean(text).split(' ');
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
            const logoData = getAsset('logo', lp);
            if (logoData) {
                const li = await pdfDoc.embedPng(logoData);
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
        
        // Sno(30), Desc(220), Qty(40), Weight(60), Dims(remainder)
        const cols = [
            { l: 'Sno.', w: 30 }, 
            { l: 'Description of Goods', w: 220 }, 
            { l: 'Qty', w: 40 },
            { l: 'Weight(Ch.)', w: 60 },
            { l: 'Dimensions', w: tableWidth - 350 }
        ];

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
        const descText = booking.serviceType === 'campus-parcel' 
            ? (booking.packageDetails?.description || 'Campus Parcel Shipment')
            : ([booking.packageDetails?.description, booking.notes].filter(Boolean).join(' | ') || 'Shipment Content');

        const lastDescY = wrapText(descText, startX + 35, startItemY, 210, fonts.regular, 7.5);

        // Dimensions logic
        let ds = 'N/A';
        const pkg = booking.packageDetails || {};
        const dims = pkg.dimensions || [];

        if (isEdl && pkg.edlItems && pkg.edlItems.length > 0) {
            ds = pkg.edlItems.map(item => item.dims || item.dimensions).filter(Boolean).join(' | ');
        } else if (Array.isArray(dims) && dims.length > 0) {
            ds = dims.map(d => {
                if (!d) return '';
                const l = d.length || d.L || d.len || 0;
                const w = d.width || d.W || d.wid || 0;
                const h = d.height || d.H || d.hei || 0;
                return (l || w || h) ? `${l}x${w}x${h}` : '';
            }).filter(Boolean).join(' | ');
        }
        if (!ds || ds === '') ds = 'N/A';

        const rowBot = Math.min(lastDescY, startItemY - 20) - 8;
        const r7H = globalY - rowBot;

        let cx2 = startX;
        drawCell('1', cx2, globalY, cols[0].w, r7H, fonts.regular, 8, 'center');
        cx2 += cols[0].w + cols[1].w;
        drawCell(String(booking.packageDetails?.boxQuantity || 1), cx2, globalY, cols[2].w, r7H, fonts.regular, 8, 'center');
        cx2 += cols[2].w;
        
        const weightVal = booking.packageDetails?.chargeableWeight || booking.packageDetails?.weight || 0;
        const weightUnit = booking.packageDetails?.chargeableWeightUnit || booking.packageDetails?.weightUnit || 'kg';
        drawCell(`${weightVal}${weightUnit}`, cx2, globalY, cols[3].w, r7H, fonts.bold, 8, 'center');
        cx2 += cols[3].w;

        if (fonts.regular.widthOfTextAtSize(ds, 7.5) > cols[4].w - 10) {
            wrapText(ds, cx2 + 5, startItemY, cols[4].w - 10, fonts.regular, 6.5);
        } else {
            drawCell(ds, cx2, globalY, cols[4].w, r7H, fonts.regular, 7.5, 'center');
        }

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
        drawCell(`DELIVERY: ${booking.estimatedDelivery || '5-7 Days'}`, startX, globalY - 36, 200, 18, fonts.oblique, 7.5);

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
            const sigData = getAsset('signature', sp);
            if (sigData) {
                const si = await pdfDoc.embedPng(sigData);
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
            const payFontSize = 7.5;
            
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
        } else {
            globalY -= 10;
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

async function generateLabelPDF(booking) {
    try {
        const pdfDoc = await PDFDocument.create();

        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        };

        const black = rgb(0, 0, 0);
        const red = rgb(1, 0, 0);
        const margin = 15;

        // Parse items into individual labels
        const itemsStr = booking.packageDetails?.items || booking.packageDetails?.description || "";
        const totalCount = booking.packageDetails?.totalItems || booking.packageDetails?.totalBoxes || booking.packageDetails?.boxQuantity || 1;
        const expandedItems = parseItems(itemsStr, totalCount);

        for (let i = 0; i < expandedItems.length; i++) {
            const boxName = expandedItems[i];
            const boxSequence = `${i + 1} / ${expandedItems.length}`;

            // A6 size for shipping label
            const page = pdfDoc.addPage([297.64, 419.53]);
            const { width, height } = page.getSize();
            let globalY = height - margin;

            const drawText = (t, x, y, size, font) => {
                page.drawText(clean(t), { x, y, size, font, color: black });
            };

            // Header
            page.drawRectangle({ x: margin, y: globalY - 30, width: width - (margin * 2), height: 30, color: black });
            page.drawText('ENGINEERS PARCEL', { x: margin + 10, y: globalY - 20, size: 14, font: fonts.bold, color: rgb(1, 1, 1) });
            globalY -= 40;

            // QR / Tracking ID
            const tid = String(booking.trackingId || booking.bookingId || 'EP-PENDING');
            const qrContent = [
                `ID: ${tid}`,
                `FROM: ${booking.senderDetails?.name || 'N/A'}, ${booking.senderDetails?.phone || ''}`,
                `TO: ${booking.receiverDetails?.name || 'N/A'}, ${booking.receiverDetails?.phone || ''}`
            ].join('\n');

            try {
                const qrCodeDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 80 });
                const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
                const qrImage = await pdfDoc.embedPng(qrImageBytes);
                page.drawImage(qrImage, { x: width - margin - 80, y: globalY - 50, width: 80, height: 80 });
            } catch (e) { }

            drawText('TRACKING ID:', margin, globalY, 10, fonts.bold);
            drawText(tid, margin, globalY - 15, 14, fonts.bold);
            drawText(`Service: ${(booking.serviceType || 'STD').toUpperCase()}`, margin, globalY - 30, 10, fonts.bold);

            // --- TOP RED BOX (Sequence) ---
            if (expandedItems.length > 1) {
                const rectW = 110;
                const rectH = 45;
                const rectX = margin + 5;
                const rectY = globalY - 80;
                page.drawRectangle({ x: rectX, y: rectY, width: rectW, height: rectH, borderColor: red, borderWidth: 2 });
                const seqW = fonts.bold.widthOfTextAtSize(boxSequence, 20);
                page.drawText(boxSequence, { x: rectX + (rectW / 2) - (seqW / 2), y: rectY + 15, size: 20, font: fonts.bold, color: black });
            }

            globalY -= 85;
            page.drawLine({ start: { x: margin, y: globalY }, end: { x: width - margin, y: globalY }, thickness: 1 });
            globalY -= 15;

            // Receiver (TO)
            drawText('TO (RECEIVER):', margin, globalY, 12, fonts.bold);
            globalY -= 15;
            drawText(booking.receiverDetails?.name || 'N/A', margin, globalY, 10, fonts.bold);
            globalY -= 12;
            const rAddr = booking.receiverDetails?.address || '';
            const rWords = rAddr.split(' ');
            let rLine = '';
            for (const w of rWords) {
                if (fonts.regular.widthOfTextAtSize(rLine + w + ' ', 9) > (width - margin * 2)) {
                    drawText(rLine, margin, globalY, 9, fonts.regular);
                    rLine = w + ' ';
                    globalY -= 10;
                } else {
                    rLine += w + ' ';
                }
            }
            drawText(rLine, margin, globalY, 9, fonts.regular);
            globalY -= 12;
            drawText(`${booking.receiverDetails?.pincode || ''} - ${booking.receiverDetails?.city || ''}`, margin, globalY, 10, fonts.bold);
            globalY -= 12;
            drawText(`Ph: ${booking.receiverDetails?.phone || ''}`, margin, globalY, 10, fonts.bold);
            globalY -= 20;

            page.drawLine({ start: { x: margin, y: globalY }, end: { x: width - margin, y: globalY }, thickness: 1 });
            globalY -= 15;

            // Sender (FROM)
            drawText('FROM (SENDER):', margin, globalY, 10, fonts.bold);
            globalY -= 12;
            drawText(booking.senderDetails?.name || 'N/A', margin, globalY, 9, fonts.bold);
            globalY -= 12;

            const sAddr = booking.senderDetails?.address || '';
            const sWords = sAddr.split(' ');
            let sLine = '';
            for (const w of sWords) {
                if (fonts.regular.widthOfTextAtSize(sLine + w + ' ', 9) > (width - margin * 2)) {
                    drawText(sLine, margin, globalY, 9, fonts.regular);
                    sLine = w + ' ';
                    globalY -= 10;
                } else {
                    sLine += w + ' ';
                }
            }
            drawText(sLine, margin, globalY, 9, fonts.regular);
            globalY -= 12;
            if (booking.serviceType === 'campus-parcel') {
                drawText('IIT ISM Dhanbad - 826004', margin, globalY, 10, fonts.bold);
            } else {
                drawText(`${booking.senderDetails?.city || ''} - ${booking.senderDetails?.pincode || ''}`, margin, globalY, 10, fonts.bold);
            }
            globalY -= 12;
            drawText(`Ph: ${booking.senderDetails?.phone || ''}`, margin, globalY, 9, fonts.regular);
            globalY -= 20;

            page.drawLine({ start: { x: margin, y: globalY }, end: { x: width - margin, y: globalY }, thickness: 1 });
            globalY -= 15;

            // Package Box Details removed as requested
            globalY -= 15;


            // --- BOTTOM RED BOX (Box Name) ---
            const nameRectW = 150;
            const nameRectH = 40;
            const nameRectX = margin;
            const nameRectY = 40; 
            page.drawRectangle({ x: nameRectX, y: nameRectY, width: nameRectW, height: nameRectH, borderColor: red, borderWidth: 2 });
            const nameW = fonts.bold.widthOfTextAtSize(boxName, 14);
            page.drawText(clean(boxName), { x: nameRectX + (nameRectW / 2) - (nameW / 2), y: nameRectY + 15, size: 14, font: fonts.bold, color: black });

            // Subtext
            drawText('Please do not bend. Handle with care.', margin, margin + 10, 8, fonts.regular);
        }

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("❌ generateLabelPDF ERROR:", error);
        throw error;
    }
}

async function generateDeclarationPDF(booking) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
            oblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        };

        const black = rgb(0, 0, 0);
        const margin = 50;
        let globalY = height - 50;

        const drawText = (t, x, y, size, font) => {
            page.drawText(clean(t), { x, y, size, font, color: black });
        };

        // Title
        drawText('SELF DECLARATION FORM', width / 2 - 100, globalY, 16, fonts.bold);
        globalY -= 40;

        drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, margin, globalY, 11, fonts.regular);
        drawText(`Tracking ID: ${booking.bookingId || 'PENDING'}`, width - margin - 150, globalY, 11, fonts.bold);
        globalY -= 40;

        // Content
        const lines = [
            `I, ${booking.senderDetails?.name || '_______________'}, hereby declare that the goods/parcel`,
            `being dispatched through Engineers Parcel do not contain any prohibited,`,
            `hazardous, or illegal items.`
        ];
        lines.forEach(line => {
            drawText(line, margin, globalY, 12, fonts.regular);
            globalY -= 15;
        });

        globalY -= 20;
        drawText('I explicitly confirm that the parcel DOES NOT contain:', margin, globalY, 12, fonts.bold);
        globalY -= 25;

        const prohibited = [
            "1. Medicines of any kind (Prescription or counter)",
            "2. Alcoholic items or Beverages",
            "3. Indecent or Obscene materials",
            "4. Flammable, Hazardous, or Explosive items",
            "5. Drugs or Narcotics",
            "6. Any item banned by the relevant State or Central Authorities"
        ];

        prohibited.forEach(item => {
            drawText(item, margin + 20, globalY, 11, fonts.regular);
            globalY -= 20;
        });

        globalY -= 20;
        const liability = [
            `I understand that strict inspection will be performed by the authorities.`,
            `If any of the aforementioned prohibited items are found during scanning`,
            `or transit, I take full legal responsibility. I understand that legal action`,
            `may be taken by authorities, and Engineers Parcel holds no liability.`
        ];

        liability.forEach(line => {
            drawText(line, margin, globalY, 11, fonts.regular);
            globalY -= 15;
        });

        globalY -= 40;
        drawText('SENDER DETAILS:', margin, globalY, 12, fonts.bold);
        globalY -= 15;
        drawText(`Name: ${booking.senderDetails?.name || 'N/A'}`, margin, globalY, 11, fonts.regular);
        globalY -= 15;
        drawText(`Phone: ${booking.senderDetails?.phone || 'N/A'}`, margin, globalY, 11, fonts.regular);
        globalY -= 15;
        drawText(`Address: ${booking.senderDetails?.address || 'N/A'}, ${booking.senderDetails?.city || 'N/A'} - ${booking.senderDetails?.pincode || 'N/A'}`, margin, globalY, 11, fonts.regular);
        globalY -= 20;
        
        // --- DECLARED VALUE (Restored from booking.packageDetails.value) ---
        const declaredVal = booking.packageDetails?.value || booking.packageDetails?.itemValue || 0;
        drawText(`Declared Value of Items: Rs. ${declaredVal}`, margin, globalY, 11, fonts.bold);

        // Signature block
        globalY -= 80;
        page.drawLine({ start: { x: margin, y: globalY }, end: { x: margin + 150, y: globalY }, thickness: 1 });
        drawText(`Signature of the Sender`, margin, globalY - 15, 10, fonts.bold);
        drawText(` accepted by ${booking.senderDetails?.name || 'Sender'}`, margin, globalY - 30, 9, fonts.oblique);

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("❌ generateDeclarationPDF ERROR:", error);
        throw error;
    }
}

/**
 * Redesigned Shipping Label for Office Use (Declaration Style)
 */
async function generateOfficeLabelPDF(booking) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        };

        const black = rgb(0, 0, 0);
        const margin = 45;
        let globalY = height - margin;

        const isEdl = booking.edl > 0 || booking.packageDetails?.isEdl || (booking.packageDetails?.description && booking.packageDetails.description.toUpperCase().includes('EDL'));

        const drawHLine = (y, xStart = margin, xEnd = width - margin) => page.drawLine({ start: { x: xStart, y }, end: { x: xEnd, y }, thickness: 0.8, color: black });
        const drawText = (t, x, y, size = 10, font = fonts.regular) => page.drawText(clean(t), { x, y, size, font, color: black });
        const drawCheckbox = (x, y) => page.drawRectangle({ x, y, width: 25, height: 12, borderWidth: 1, borderColor: black });

        // --- 1. Logo ---
        try {
            const lp = path.join(__dirname, '..', 'public', 'logo.png');
            const logoData = getAsset('logo', lp);
            if (logoData) {
                const li = await pdfDoc.embedPng(logoData);
                const ld = li.scaleToFit(140, 60);
                page.drawImage(li, { x: (width / 2) - (ld.width / 2), y: globalY - 45, width: ld.width, height: ld.height });
            }
        } catch (e) { }
        globalY -= 70;

        // --- 2. Title ---
        const titleText = "DECLARATION FORM";
        const titleWidth = fonts.bold.widthOfTextAtSize(titleText, 14);
        drawText(titleText, (width / 2) - (titleWidth / 2), globalY, 14, fonts.bold);
        drawHLine(globalY - 2, (width / 2) - (titleWidth / 2), (width / 2) + (titleWidth / 2));
        globalY -= 40;

        // --- 3. Consignment No & Date ---
        drawText("Consignment No:", margin, globalY, 11, fonts.bold);
        const tid = String(booking.trackingId || booking.bookingId || 'PENDING');
        drawText(tid, margin + 105, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, margin + 100, margin + 280);

        drawText("Date:", width - margin - 180, globalY, 11, fonts.bold);
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        drawText(dateStr, width - margin - 145, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, width - margin - 150, width - margin);
        globalY -= 35;

        // --- 4. Consignor Details ---
        drawText("Consignor Details:", margin, globalY, 9, fonts.bold);
        drawHLine(globalY - 1, margin, margin + 85);
        globalY -= 15;

        drawText("Name:", margin, globalY, 11, fonts.bold);
        drawText(booking.senderDetails?.name, margin + 45, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, margin + 40, margin + 350);
        globalY -= 20;

        // GST Section
        drawText("GST Registered:", margin, globalY, 10, fonts.bold);
        drawText("Yes", margin + 85, globalY, 10, fonts.regular);
        drawCheckbox(margin + 115, globalY - 2);
        drawText("No", margin + 85, globalY - 15, 10, fonts.regular);
        drawCheckbox(margin + 115, globalY - 17);

        drawText("If Yes, GST No:", margin + 160, globalY, 10, fonts.regular);
        drawHLine(globalY - 2, margin + 240, width - margin - 100);

        const legalText = [
            "We, M/s ____________________________________, hereby declare and confirm that we",
            "are not liable to register under Section 22 or Section 24 of the Central GST Act, 2017",
            "or under the corresponding provisions of the applicable State GST Act. (Stamp)"
        ];
        legalText.forEach((line, i) => {
            drawText(line, margin + 160, globalY - 15 - (i * 12), 8.5, fonts.regular);
        });
        globalY -= 55;

        // --- 5. Consignee Details ---
        drawText("Consignee Details:", margin, globalY, 9, fonts.bold);
        drawHLine(globalY - 1, margin, margin + 85);
        globalY -= 15;

        drawText("Name:", margin, globalY, 11, fonts.bold);
        drawText(booking.receiverDetails?.name, margin + 45, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, margin + 40, margin + 250);

        drawText("Place of Delivery:", margin + 265, globalY, 11, fonts.bold);
        drawText(booking.receiverDetails?.city, margin + 375, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, margin + 370, width - margin);
        globalY -= 25;

        drawHLine(globalY, margin, width - margin);
        globalY -= 15;

        // Consignee GST
        drawText("GST Registered:", margin, globalY, 10, fonts.bold);
        drawText("Yes", margin + 85, globalY, 10, fonts.regular);
        drawCheckbox(margin + 115, globalY - 2);
        drawText("No", margin + 85, globalY - 15, 10, fonts.regular);
        drawCheckbox(margin + 115, globalY - 17);

        drawText("If Yes, GST No:", margin + 160, globalY, 10, fonts.regular);
        drawHLine(globalY - 2, margin + 240, width - margin - 100);

        const legalText2 = [
            "We, M/s ____________________________('consignor'), hereby declare to the best",
            "of our knowledge that M/s ____________________________('Consignee') are",
            "not liable to register under Section 22 or Section 24 of the Central GST Act, 2017 or",
            "under the corresponding provisions of the applicable State GST Act."
        ];
        legalText2.forEach((line, i) => {
            drawText(line, margin + 160, globalY - 15 - (i * 12), 8.5, fonts.regular);
        });
        globalY -= 70;

        // --- 6. Content Section ---
        drawText("Content:", margin, globalY, 11, fonts.bold);
        drawText(booking.packageDetails?.description, margin + 55, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, margin + 50, width - margin);
        globalY -= 18;
        drawHLine(globalY - 2, margin, width - margin);
        globalY -= 15;

        drawText("If Consignor or Consignee is GST Registered, mention HSN Code :", margin, globalY, 9, fonts.regular);
        drawHLine(globalY - 2, margin + 300, width - margin);
        globalY -= 15;

        drawText("Reason for Transportation:", margin, globalY, 11, fonts.bold);
        drawHLine(globalY - 2, margin + 155, width - margin);
        globalY -= 15;

        drawText("If this consignment is of commercial nature: Yes", margin, globalY, 10, fonts.bold);
        drawCheckbox(margin + 235, globalY - 2);
        drawText("No", margin + 275, globalY, 10, fonts.bold);
        drawCheckbox(margin + 295, globalY - 2);
        globalY -= 20;

        // Value Section
        drawText("Value of Consignment :", margin, globalY, 11, fonts.bold);
        drawText("((Irrespective of the commercial/Non-commercial nature of consignment)", margin + 125, globalY, 9, fonts.regular);
        globalY -= 20;

        drawText("Rs.", margin + 25, globalY, 11, fonts.regular);
        const valBox = { x: margin + 50, y: globalY - 5, w: 100, h: 20 };
        page.drawRectangle({ ...valBox, borderWidth: 1, borderColor: black });
        drawText(String(booking.packageDetails?.value || 0), valBox.x + 5, valBox.y + 5, 11, fonts.bold);

        drawText("(Rupees ", valBox.x + valBox.w + 10, globalY, 11, fonts.regular);
        drawHLine(globalY - 2, valBox.x + valBox.w + 60, width - margin - 15);
        drawText(")", width - margin - 10, globalY, 11, fonts.regular);
        globalY -= 35;

        drawHLine(globalY, margin, margin + 140);
        drawText("Date", margin + 50, globalY - 15, 10, fonts.bold);

        drawHLine(globalY, width - margin - 180, width - margin);
        drawText("Signature of the Consignor", width - margin - 165, globalY - 15, 10, fonts.bold);

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("PDF-LIB Office Label Error:", error);
        throw error;
    }
}

/**
 * Combined PDF Generator: Receipt + Label + Declaration (Selective)
 */
async function generateCombinedPDF(booking, options = { receipt: true, label: true, declaration: true }) {
    try {
        const mergedPdf = await PDFDocument.create();
        
        const includeReceipt = options.receipt !== 'false' && options.receipt !== false;
        const includeLabel = options.label !== 'false' && options.label !== false;
        const includeDecl = options.declaration !== 'false' && options.declaration !== false;

        if (includeReceipt) {
            const receiptBytes = await generateReceiptPDF(booking);
            const receiptDoc = await PDFDocument.load(receiptBytes);
            const receiptPages = await mergedPdf.copyPages(receiptDoc, receiptDoc.getPageIndices());
            receiptPages.forEach(page => mergedPdf.addPage(page));
        }

        if (includeLabel) {
            const labelBytes = await generateLabelPDF(booking);
            const labelDoc = await PDFDocument.load(labelBytes);
            const labelPages = await mergedPdf.copyPages(labelDoc, labelDoc.getPageIndices());
            labelPages.forEach(page => mergedPdf.addPage(page));
        }

        if (includeDecl) {
            const declarationBytes = await generateDeclarationPDF(booking);
            const declarationDoc = await PDFDocument.load(declarationBytes);
            const declarationPages = await mergedPdf.copyPages(declarationDoc, declarationDoc.getPageIndices());
            declarationPages.forEach(page => mergedPdf.addPage(page));
        }

        if (mergedPdf.getPageCount() === 0) {
            mergedPdf.addPage();
        }

        const finalBytes = await mergedPdf.save();
        return Buffer.from(finalBytes);
    } catch (error) {
        console.error("Combined PDF Error:", error);
        throw error;
    }
}

module.exports = {
    generateReceiptPDF,
    generateLabelPDF,
    generateDeclarationPDF,
    generateOfficeLabelPDF,
    generateCombinedPDF
};
