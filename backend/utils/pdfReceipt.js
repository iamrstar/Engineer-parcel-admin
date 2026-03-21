const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

/**
 * Professional E-Receipt PDF Generator for Engineers Parcel.
 * Ported from the Next.js E-Docket implementation.
 */
async function generateReceiptPDF(booking) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        const black = rgb(0, 0, 0);
        const darkGray = rgb(0.2, 0.2, 0.2);
        const headerBg = rgb(0.85, 0.85, 0.90);

        const margin = 40;
        const startX = margin;
        const endX = width - margin;
        const tableWidth = endX - startX;
        const midX = startX + tableWidth / 2;

        let y = height - margin;
        const topY = y;

        const drawCellText = (text, x, yTop, boxW, boxH, font, size, align = 'left', color = black) => {
            const tw = font.widthOfTextAtSize(text, size);
            const th = font.sizeAtHeight(size);
            let textX = x + 5;
            if (align === 'center') textX = x + (boxW / 2) - (tw / 2);
            let textY = yTop - (boxH / 2) - (th / 2) + 2;
            page.drawText(text, { x: textX, y: textY, size, font, color });
        };

        const drawHLine = (yPos) => page.drawLine({ start: { x: startX, y: yPos }, end: { x: endX, y: yPos }, thickness: 1, color: black });
        const drawVLine = (xPos, yTop, yBot) => page.drawLine({ start: { x: xPos, y: yTop }, end: { x: xPos, y: yBot }, thickness: 1, color: black });

        // ROW 1: HEADER
        const r1H = 80;
        const r1Y = y - r1H;

        try {
            // Point to backend/public instead of frontend
            const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedPng(logoBytes);
            const maxLogoW = midX - startX - 20;
            const maxLogoH = r1H - 20;
            const logoDims = logoImage.scaleToFit(maxLogoW, maxLogoH);
            page.drawImage(logoImage, {
                x: startX + ((midX - startX) / 2) - (logoDims.width / 2),
                y: y - ((r1H / 2) + (logoDims.height / 2)),
                width: logoDims.width,
                height: logoDims.height,
            });
        } catch (e) {
            drawCellText('ENGINEERS PARCEL', startX, y, midX - startX, r1H, fontBold, 16, 'center');
        }

        const c1H = r1H / 4;
        let cy = y;
        const lines = [
            'Address: 4th Floor, I2H Building, IIT (ISM) Dhanbad - 826004',
            'SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED',
            'Contact No. : 9708815717 / 9525801506',
            'info@engineersparcel.in | www.engineersparcel.in'
        ];

        for (let i = 0; i < 4; i++) {
            drawCellText(lines[i], midX, cy, endX - midX, c1H, i === 1 ? fontBold : fontRegular, 8.5);
            if (i < 3) drawHLine(cy - c1H);
            cy -= c1H;
        }

        drawVLine(midX, y, r1Y);
        drawHLine(r1Y);
        y = r1Y;

        // ROW 2
        const r2H = 25;
        const r2Y = y - r2H;
        drawCellText('BOOKING RECEIPT', startX, y, midX - startX, r2H, fontBold, 16, 'center');
        const idToDisplay = booking.trackingId || booking.bookingId || 'Pending';
        drawCellText(`Tracking ID: ${idToDisplay}`, midX, y, endX - midX, r2H, fontBold, 10, 'left');
        drawVLine(midX, y, r2Y);
        drawHLine(r2Y);
        y = r2Y;

        // ROW 3
        const r3H = 20;
        const r3Y = y - r3H;
        const bDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
        drawCellText(`Receipt No. ${idToDisplay}`, startX, y, midX - startX, r3H, fontBold, 9);
        drawCellText(`Booking Date: ${bDate}`, midX, y, endX - midX, r3H, fontBold, 9);
        drawVLine(midX, y, r3Y);
        drawHLine(r3Y);
        y = r3Y;

        // ROW 4
        const r4H = 15;
        const r4Y = y - r4H;
        page.drawRectangle({ x: startX, y: r4Y, width: tableWidth, height: r4H, color: headerBg });
        drawCellText('SENDER DETAILS', startX, y, midX - startX, r4H, fontBold, 9);
        drawCellText('RECEIVER DETAILS', midX, y, endX - midX, r4H, fontBold, 9);
        drawVLine(midX, y, r4Y);
        drawHLine(r4Y);
        y = r4Y;

        // ROW 5
        const r5H = 90;
        const r5Y = y - r5H;
        const drawDetails = (details, xOffset) => {
            let dy = y - 12;
            page.drawText(`Name:   ${details?.name || 'N/A'}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular }); dy -= 12;
            page.drawText(`Phone:  ${details?.phone || 'N/A'}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular }); dy -= 12;
            page.drawText(`Email:  ${details?.email || 'N/A'}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular }); dy -= 12;

            let addr = details?.address || '';
            if (details?.address1) addr = [details.address1, details.address2].filter(Boolean).join(', ');
            if (addr.length > 50) addr = addr.substring(0, 48) + '...';
            page.drawText(`Address: ${addr || 'N/A'}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular }); dy -= 12;
            page.drawText(`City:   ${details?.city || ''}, ${details?.state || ''}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular }); dy -= 12;
            page.drawText(`Pincode: ${details?.pincode || ''}`, { x: xOffset + 5, y: dy, size: 9, font: fontRegular });
        };

        drawDetails(booking.senderDetails, startX);
        drawDetails(booking.receiverDetails, midX);
        drawVLine(midX, y, r5Y);
        drawHLine(r5Y);
        y = r5Y;

        // ROW 6
        const r6H = 15;
        const r6Y = y - r6H;
        page.drawRectangle({ x: startX, y: r6Y, width: tableWidth, height: r6H, color: headerBg });

        const c1X = startX + 30; // Sno
        const c2X = c1X + 130;  // Contents
        const c3X = c2X + 100;  // Service Type
        const c4X = c3X + 70;   // Weight
        const c5X = c4X + 50;   // Qty

        drawCellText('Sno.', startX, y, c1X - startX, r6H, fontBold, 8, 'center');
        drawCellText('Items', c1X, y, c2X - c1X, r6H, fontBold, 8, 'center');
        drawCellText('Mode', c2X, y, c3X - c2X, r6H, fontBold, 8, 'center');
        drawCellText('Act. Wt.', c3X, y, c4X - c3X, r6H, fontBold, 8, 'center');
        drawCellText('Qty.', c4X, y, c5X - c4X, r6H, fontBold, 8, 'center');
        drawCellText('Dimensions', c5X, y, endX - c5X, r6H, fontBold, 8, 'center');

        drawVLine(c1X, y, r6Y); drawVLine(c2X, y, r6Y); drawVLine(c3X, y, r6Y); drawVLine(c4X, y, r6Y); drawVLine(c5X, y, r6Y);
        drawHLine(r6Y);
        y = r6Y;

        // ROW 7
        const r7H = 25;
        const r7Y = y - r7H;
        const contentsText = [booking.packageDetails?.description, booking.notes].filter(Boolean).join(' | ') || 'N/A';
        const dims = booking.packageDetails?.dimensions;
        const dimText = dims && dims.length && dims.width && dims.height ? `${dims.length} x ${dims.width} x ${dims.height} cm` : 'N/A';

        drawCellText('1', startX, y, c1X - startX, r7H, fontRegular, 8, 'center');
        drawCellText(contentsText.length > 25 ? contentsText.substring(0, 22) + '...' : contentsText, c1X, y, c2X - c1X, r7H, fontRegular, 8, 'center');
        drawCellText((booking.serviceType || 'Standard').toUpperCase(), c2X, y, c3X - c2X, r7H, fontRegular, 8, 'center');
        drawCellText(`${booking.packageDetails?.weight || 0} ${booking.packageDetails?.weightUnit || 'kg'}`, c3X, y, c4X - c3X, r7H, fontRegular, 8, 'center');
        drawCellText(`${booking.packageDetails?.boxQuantity || 1}`, c4X, y, c5X - c4X, r7H, fontRegular, 8, 'center');
        drawCellText(dimText, c5X, y, endX - c5X, r7H, fontRegular, 8, 'center');

        drawVLine(c1X, y, r7Y); drawVLine(c2X, y, r7Y); drawVLine(c3X, y, r7Y); drawVLine(c4X, y, r7Y); drawVLine(c5X, y, r7Y);
        drawHLine(r7Y);
        y = r7Y;

        // SUBTOTAL ROW
        const rSubH = 15;
        const rSubY = y - rSubH;
        drawCellText('Subtotal:', c4X, y, c5X - c4X, rSubH, fontBold, 8, 'center');
        const subtotal = (booking.pricing?.basePrice || 0) + (booking.pricing?.additionalCharges || booking.pricing?.packagingCharge || 0);
        drawCellText(`Rs.${subtotal}`, c5X, y, endX - c5X, rSubH, fontRegular, 8, 'center');
        drawVLine(c5X, y, rSubY);
        drawHLine(rSubY);
        y = rSubY;

        // TAX ROW
        const rTaxH = 15;
        const rTaxY = y - rTaxH;
        drawCellText('Tax (GST):', c4X, y, c5X - c4X, rTaxH, fontBold, 8, 'center');
        drawCellText(`Rs.${booking.pricing?.tax || 0}`, c5X, y, endX - c5X, rTaxH, fontRegular, 8, 'center');
        drawVLine(c5X, y, rTaxY);
        drawHLine(rTaxY);
        y = rTaxY;

        // TOTAL AMOUNT ROW
        const rTotalH = 20;
        const rTotalY = y - rTotalH;
        page.drawRectangle({ x: c4X, y: rTotalY, width: endX - c4X, height: rTotalH, color: headerBg });
        drawCellText('Total Amount:', c4X, y, c5X - c4X, rTotalH, fontBold, 8, 'right');
        drawCellText(`Rs.${booking.pricing?.totalAmount || 0}`, c5X, y, endX - c5X, rTotalH, fontBold, 10, 'center');
        drawVLine(c5X, y, rTotalY);
        drawHLine(rTotalY);
        y = rTotalY;

        // ROW 8
        const r8H = 25;
        const r8Y = y - r8H;
        drawCellText(`Special Notes: ${contentsText}`, startX, y, tableWidth, r8H, fontOblique, 8);
        drawHLine(r8Y);
        y = r8Y;

        // FOOTER AREA
        const rFootY = margin + 10;
        const trackText1 = "Track your shipment at: www.engineersparcel.in";
        const authText = "This is an electronically generated receipt and does not require a physical signature.";

        // Special Notes box should have a fixed height or at least some padding
        const notesBoxHeight = y - (rFootY + 80);
        if (notesBoxHeight > 0) {
            drawVLine(midX, y, rFootY + 80);
        }

        // Tracking & Legal Info (Left side of footer area)
        page.drawText(trackText1, { x: startX + 10, y: rFootY + 65, size: 9, font: fontBold, color: darkGray });
        page.drawText(authText, { x: startX + 10, y: rFootY + 52, size: 8, font: fontOblique, color: darkGray });

        // QR CODE (Center)
        if (booking.paymentLink) {
            try {
                const qrCodeDataUrl = await QRCode.toDataURL(booking.paymentLink, {
                    margin: 1,
                    width: 80,
                    color: { dark: '#000000', light: '#ffffff' },
                });
                const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
                const qrImage = await pdfDoc.embedPng(qrImageBytes);
                const qrDims = qrImage.scale(0.7);

                page.drawImage(qrImage, {
                    x: midX - (qrDims.width / 2),
                    y: rFootY + 25,
                    width: qrDims.width,
                    height: qrDims.height,
                });
                page.drawText("Scan to Pay", {
                    x: midX - (fontBold.widthOfTextAtSize("Scan to Pay", 7) / 2),
                    y: rFootY + 15,
                    size: 7,
                    font: fontBold,
                    color: darkGray
                });
            } catch (qrError) {
                console.error("QR Code Error:", qrError);
            }
        }



        // SIGNATURES (Left and Right)
        // Receiver's Signature (Left)
        page.drawLine({ start: { x: startX + 20, y: rFootY + 30 }, end: { x: startX + 140, y: rFootY + 30 }, thickness: 0.5, color: darkGray });
        page.drawText("Receiver's Signature", { x: startX + 40, y: rFootY + 15, size: 8, font: fontOblique, color: darkGray });

        // Authorized Signatory (Right)
        try {
            const sigPath = path.join(__dirname, '..', 'public', 'signature.png');
            if (fs.existsSync(sigPath)) {
                const sigBytes = fs.readFileSync(sigPath);
                const sigImage = await pdfDoc.embedPng(sigBytes);
                const sigDims = sigImage.scaleToFit(100, 40);
                page.drawImage(sigImage, {
                    x: endX - sigDims.width - 20,
                    y: rFootY + 35,
                    width: sigDims.width,
                    height: sigDims.height,
                });
            }
        } catch (e) { }

        page.drawLine({ start: { x: endX - 140, y: rFootY + 30 }, end: { x: endX - 20, y: rFootY + 30 }, thickness: 0.5, color: darkGray });
        page.drawText("Authorized Signatory", { x: endX - 110, y: rFootY + 15, size: 8, font: fontOblique, color: darkGray });

        // Main Border
        page.drawRectangle({
            x: startX, y: margin, width: tableWidth, height: topY - margin,
            borderColor: black, borderWidth: 1.5,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("PDF-LIB Error:", error);
        throw error;
    }
}

module.exports = { generateReceiptPDF };
