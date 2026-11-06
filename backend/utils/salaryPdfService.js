const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");

// Cache for logos & signature assets
const assetCache = {
    logo: null,
    signature: null,
};

const clean = (str) => {
    if (str === null || str === undefined) return '';
    const s = typeof str === 'string' ? str : String(str);
    return s
        .replace(/[\t\r\n\v\f]+/g, ' ')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[^\x20-\x7E]/g, '')
        .trim();
};

const numberToWords = (num) => {
    num = Math.round(Number(num) || 0);
    if (num <= 0) return "Zero";
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanOneThousand = (n) => {
        let str = '';
        if (n >= 100) {
            str += a[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n > 0) {
            if (n < 20) {
                str += a[n] + ' ';
            } else {
                str += b[Math.floor(n / 10)] + ' ';
                if (n % 10 > 0) {
                    str += a[n % 10] + ' ';
                }
            }
        }
        return str.trim();
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) result += convertLessThanOneThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanOneThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanOneThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanOneThousand(remainder) + ' ';

    return result.trim();
};

const getAsset = (name, filePath) => {
    if (assetCache[name]) return assetCache[name];
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            assetCache[name] = data;
            return data;
        }
    } catch (e) {
        console.error(`Asset load error (${name}):`, e.message);
    }
    return null;
};

/**
 * Generates an official, high-resolution Salary Slip PDF for Engineers Parcel employees.
 * Styled matching the user-specified modern layout.
 * @param {Object} slipData
 * @returns {Promise<Buffer>}
 */
async function generateSalarySlipPDF(slipData) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        oblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    };

    const margin = 32;
    const startX = margin;
    const endX = width - margin;
    const contentWidth = endX - startX;

    const black = rgb(0.08, 0.1, 0.13);
    const darkNavy = rgb(0.06, 0.1, 0.16);
    const textGray = rgb(0.45, 0.5, 0.56);
    const borderGray = rgb(0.85, 0.88, 0.91);
    const lightBg = rgb(0.98, 0.985, 0.99);
    const primaryBlue = rgb(0.01, 0.45, 0.8);
    const emeraldGreen = rgb(0.0, 0.53, 0.35); // #00875A
    const roseRed = rgb(0.85, 0.15, 0.15);
    const amberBg = rgb(1.0, 0.98, 0.92);
    const amberBorder = rgb(0.96, 0.84, 0.58);
    const amberText = rgb(0.68, 0.42, 0.05);

    let currentY = height - 32;

    // Outer decorative card border
    page.drawRectangle({
        x: startX - 8,
        y: 24,
        width: contentWidth + 16,
        height: height - 56,
        borderColor: borderGray,
        borderWidth: 1,
        color: rgb(1, 1, 1),
    });

    // ─── 1. HEADER SECTION: LOGO & COMPANY INFO ON LEFT, CONFIDENTIAL & PERIOD ON RIGHT ───
    const headerH = 68;
    const logoPath = path.join(__dirname, "..", "public", "logo.png");
    const logoData = getAsset("logo", logoPath);

    if (logoData) {
        try {
            const logoImage = await pdfDoc.embedPng(logoData);
            const scaled = logoImage.scaleToFit(130, 42);
            page.drawImage(logoImage, {
                x: startX,
                y: currentY - scaled.height - 2,
                width: scaled.width,
                height: scaled.height,
            });
        } catch (e) {
            console.error("Failed to embed logo PNG:", e.message);
        }
    }

    // Company sub-details under logo
    const compTextY = currentY - 50;
    page.drawText(clean("SRQ Engineers Parcel and Haul Private Limited"), {
        x: startX,
        y: compTextY,
        size: 8.5,
        font: fonts.bold,
        color: darkNavy,
    });
    page.drawText(clean("IIT (ISM) Dhanbad - 826004, Jharkhand, India • CIN: U63090JH2023PTC021234"), {
        x: startX,
        y: compTextY - 10,
        size: 7,
        font: fonts.regular,
        color: textGray,
    });

    // Right Side of Header: Confidential Pill, Month & Pay Date
    const pillText = "CONFIDENTIAL PAYSLIP";
    const pillW = fonts.bold.widthOfTextAtSize(pillText, 7.5) + 16;
    const pillX = endX - pillW;
    const pillY = currentY - 14;

    page.drawRectangle({
        x: pillX,
        y: pillY - 4,
        width: pillW,
        height: 16,
        color: rgb(0.9, 0.96, 1.0),
        borderColor: rgb(0.7, 0.85, 0.98),
        borderWidth: 0.8,
    });
    page.drawText(pillText, {
        x: pillX + 8,
        y: pillY,
        size: 7.5,
        font: fonts.bold,
        color: primaryBlue,
    });

    const monthStr = clean((slipData.payPeriod || slipData.month || "").toUpperCase());
    const monthW = fonts.bold.widthOfTextAtSize(monthStr, 13);
    page.drawText(monthStr, {
        x: endX - monthW,
        y: pillY - 20,
        size: 13,
        font: fonts.bold,
        color: darkNavy,
    });

    const payDateFormatted = slipData.payDate
        ? new Date(slipData.payDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const payDateText = `Pay Date: ${payDateFormatted}`;
    const payDateW = fonts.regular.widthOfTextAtSize(payDateText, 7.5);
    page.drawText(payDateText, {
        x: endX - payDateW,
        y: pillY - 32,
        size: 7.5,
        font: fonts.regular,
        color: textGray,
    });

    currentY -= (headerH + 12);

    // ─── 2. EMPLOYEE & PAYMENT INFORMATION CARD (Clean 4 Columns x 2 Rows) ───
    const infoCardH = 68;
    page.drawRectangle({
        x: startX,
        y: currentY - infoCardH,
        width: contentWidth,
        height: infoCardH,
        color: lightBg,
        borderColor: borderGray,
        borderWidth: 1,
    });

    const c1 = startX + 12;
    const c2 = startX + 140;
    const c3 = startX + 270;
    const c4 = startX + 395;

    let rowY = currentY - 16;
    const rowGap = 30;

    const drawInfoCell = (label, value, xPos, valColor = black, isBlue = false) => {
        page.drawText(clean(label), {
            x: xPos,
            y: rowY,
            size: 6.5,
            font: fonts.bold,
            color: textGray,
        });
        page.drawText(clean(value || "-"), {
            x: xPos,
            y: rowY - 11,
            size: 8,
            font: fonts.bold,
            color: isBlue ? primaryBlue : valColor,
        });
    };

    // Row 1: EMPLOYEE NAME | EMPLOYEE ID | DESIGNATION | PAYMENT METHOD
    const empIdVal = slipData.employeeId || slipData.slipNumber || "EMP-001";
    drawInfoCell("EMPLOYEE NAME", slipData.employeeName, c1);
    drawInfoCell("EMPLOYEE ID", empIdVal, c2, black, true);
    drawInfoCell("DESIGNATION", slipData.designation || "Staff", c3);
    drawInfoCell("PAYMENT METHOD", "Direct Bank Transfer / NEFT", c4);

    rowY -= rowGap;

    // Row 2: EMAIL ADDRESS | MOBILE CONTACT | PAY PERIOD | RELEASE STATUS
    drawInfoCell("EMAIL ADDRESS", slipData.employeeEmail || "N/A", c1, textGray);
    drawInfoCell("MOBILE CONTACT", slipData.employeePhone || "N/A", c2);
    drawInfoCell("PAY PERIOD", slipData.payPeriod || slipData.month, c3);
    drawInfoCell("RELEASE STATUS", "* Verified Ready", c4, emeraldGreen);

    currentY -= (infoCardH + 8);

    // ─── 2.5 DEDICATED ATTENDANCE & BANK STRIP (Clean & Professional) ───
    const attStripH = 20;
    page.drawRectangle({
        x: startX,
        y: currentY - attStripH,
        width: contentWidth,
        height: attStripH,
        color: rgb(0.95, 0.965, 0.98),
        borderColor: borderGray,
        borderWidth: 0.8,
    });

    const bankStr = slipData.bankDetails?.bankName
        ? `${slipData.bankDetails.bankName} (A/C: ${slipData.bankDetails?.accountNumber?.slice(-4) ? '••••' + slipData.bankDetails.accountNumber.slice(-4) : 'NEFT'})`
        : "NEFT";

    const attText1 = `TOTAL DAYS: ${slipData.workingDays || 30}`;
    const attText2 = `PAID DAYS: ${slipData.paidDays || 30}`;
    const attText3 = `LOSS OF PAY (LOP): ${slipData.lossOfPayDays || 0}`;
    const attText4 = `BANK & A/C: ${bankStr}`;

    page.drawText(clean(attText1), { x: startX + 12, y: currentY - attStripH + 6, size: 7.5, font: fonts.bold, color: darkNavy });
    page.drawText(clean(attText2), { x: startX + 130, y: currentY - attStripH + 6, size: 7.5, font: fonts.bold, color: darkNavy });
    page.drawText(clean(attText3), { x: startX + 240, y: currentY - attStripH + 6, size: 7.5, font: fonts.bold, color: slipData.lossOfPayDays > 0 ? roseRed : darkNavy });
    page.drawText(clean(attText4), { x: startX + 375, y: currentY - attStripH + 6, size: 7.5, font: fonts.bold, color: darkNavy });

    currentY -= (attStripH + 12);

    // ─── 3. TWO-COLUMN TABLE (DARK HEADER) ───
    const halfW = contentWidth / 2;
    const tableHeaderH = 22;

    // Header Background - Dark Navy/Black
    page.drawRectangle({
        x: startX,
        y: currentY - tableHeaderH,
        width: contentWidth,
        height: tableHeaderH,
        color: darkNavy,
    });

    // Earnings Header
    page.drawText("EARNINGS & ALLOWANCES", { x: startX + 12, y: currentY - tableHeaderH + 7, size: 7.5, font: fonts.bold, color: rgb(1, 1, 1) });
    page.drawText("AMOUNT (INR)", { x: startX + halfW - 75, y: currentY - tableHeaderH + 7, size: 7.5, font: fonts.bold, color: rgb(1, 1, 1) });

    // Deductions Header
    page.drawText("DEDUCTIONS", { x: startX + halfW + 12, y: currentY - tableHeaderH + 7, size: 7.5, font: fonts.bold, color: rgb(1, 1, 1) });
    page.drawText("AMOUNT (INR)", { x: endX - 75, y: currentY - tableHeaderH + 7, size: 7.5, font: fonts.bold, color: rgb(1, 1, 1) });

    currentY -= tableHeaderH;

    const earnings = slipData.earnings && slipData.earnings.length > 0
        ? slipData.earnings
        : [{ name: "Basic / Base Salary", amount: 0 }];

    const deductions = slipData.deductions && slipData.deductions.length > 0
        ? slipData.deductions
        : [
            { name: "Provident Fund (PF)", amount: 0 },
            { name: "Professional Tax (PT)", amount: 0 },
            { name: "TDS / Income Tax", amount: 0 },
            { name: "Unpaid Leave (LOP)", amount: 0 }
        ];

    const rowCount = Math.max(earnings.length, deductions.length, 5);
    const rowHeight = 22;
    const tableBodyH = rowCount * rowHeight;

    // Table Body Box
    page.drawRectangle({
        x: startX,
        y: currentY - tableBodyH,
        width: contentWidth,
        height: tableBodyH,
        color: rgb(1, 1, 1),
        borderColor: borderGray,
        borderWidth: 1,
    });

    // Middle Vertical Divider Line
    page.drawLine({
        start: { x: startX + halfW, y: currentY },
        end: { x: startX + halfW, y: currentY - tableBodyH },
        thickness: 1,
        color: borderGray,
    });

    let currentItemY = currentY;
    for (let i = 0; i < rowCount; i++) {
        const itemCenterY = currentItemY - rowHeight + 7;

        // Subtle row divider
        if (i < rowCount - 1) {
            page.drawLine({
                start: { x: startX, y: currentItemY - rowHeight },
                end: { x: endX, y: currentItemY - rowHeight },
                thickness: 0.5,
                color: rgb(0.92, 0.94, 0.96),
            });
        }

        // Earning item
        if (i < earnings.length) {
            const e = earnings[i];
            page.drawText(clean(e.name), { x: startX + 12, y: itemCenterY, size: 8, font: fonts.regular, color: black });
            const val = Number(e.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const valW = fonts.regular.widthOfTextAtSize(val, 8);
            page.drawText(val, { x: startX + halfW - 12 - valW, y: itemCenterY, size: 8, font: fonts.regular, color: black });
        } else {
            page.drawText("-", { x: startX + 12, y: itemCenterY, size: 8, font: fonts.regular, color: textGray });
            page.drawText("-", { x: startX + halfW - 20, y: itemCenterY, size: 8, font: fonts.regular, color: textGray });
        }

        // Deduction item
        if (i < deductions.length) {
            const d = deductions[i];
            page.drawText(clean(d.name), { x: startX + halfW + 12, y: itemCenterY, size: 8, font: fonts.regular, color: black });
            const val = Number(d.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const valW = fonts.regular.widthOfTextAtSize(val, 8);
            page.drawText(val, { x: endX - 12 - valW, y: itemCenterY, size: 8, font: fonts.regular, color: d.amount > 0 ? roseRed : black });
        } else {
            page.drawText("-", { x: startX + halfW + 12, y: itemCenterY, size: 8, font: fonts.regular, color: textGray });
            page.drawText("-", { x: endX - 20, y: itemCenterY, size: 8, font: fonts.regular, color: textGray });
        }

        currentItemY -= rowHeight;
    }

    currentY -= tableBodyH;

    // ─── 4. TOTALS ROW (Gross vs Deductions) ───
    const totalsRowH = 24;
    page.drawRectangle({
        x: startX,
        y: currentY - totalsRowH,
        width: contentWidth,
        height: totalsRowH,
        color: rgb(0.96, 0.97, 0.985),
        borderColor: borderGray,
        borderWidth: 1,
    });

    // Middle vertical line in totals
    page.drawLine({
        start: { x: startX + halfW, y: currentY },
        end: { x: startX + halfW, y: currentY - totalsRowH },
        thickness: 1,
        color: borderGray,
    });

    // Gross text
    const grossValStr = Number(slipData.grossEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    page.drawText("Total Gross Earnings", { x: startX + 12, y: currentY - totalsRowH + 8, size: 8.5, font: fonts.bold, color: darkNavy });
    const grossValW = fonts.bold.widthOfTextAtSize(grossValStr, 8.5);
    page.drawText(grossValStr, { x: startX + halfW - 12 - grossValW, y: currentY - totalsRowH + 8, size: 8.5, font: fonts.bold, color: darkNavy });

    // Deductions text
    const deductValStr = Number(slipData.totalDeductions || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    page.drawText("Total Deductions", { x: startX + halfW + 12, y: currentY - totalsRowH + 8, size: 8.5, font: fonts.bold, color: roseRed });
    const deductValW = fonts.bold.widthOfTextAtSize(deductValStr, 8.5);
    page.drawText(deductValStr, { x: endX - 12 - deductValW, y: currentY - totalsRowH + 8, size: 8.5, font: fonts.bold, color: roseRed });

    currentY -= (totalsRowH + 12);

    // ─── 5. NET TAKE-HOME PAY (IN-HAND) VIBRANT EMERALD BANNER ───
    const netBannerH = 48;
    page.drawRectangle({
        x: startX,
        y: currentY - netBannerH,
        width: contentWidth,
        height: netBannerH,
        color: emeraldGreen,
    });

    page.drawText("NET TAKE-HOME PAY (IN-HAND)", {
        x: startX + 16,
        y: currentY - 18,
        size: 8.5,
        font: fonts.bold,
        color: rgb(0.85, 0.98, 0.9),
    });

    const inWordsText = `Amount in words: ${slipData.netPayInWords || numberToWords(slipData.netPay)} Rupees Only`;
    page.drawText(clean(inWordsText), {
        x: startX + 16,
        y: currentY - 34,
        size: 8,
        font: fonts.oblique,
        color: rgb(0.92, 1, 0.95),
    });

    const netAmountStr = `INR ${Number(slipData.netPay || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const netAmountW = fonts.bold.widthOfTextAtSize(netAmountStr, 17);
    page.drawText(netAmountStr, {
        x: endX - 16 - netAmountW,
        y: currentY - 30,
        size: 17,
        font: fonts.bold,
        color: rgb(1, 1, 1),
    });

    currentY -= (netBannerH + 10);

    // ─── 6. IMPORTANT NOTE ALERT BOX ───
    const noteBoxH = 22;
    page.drawRectangle({
        x: startX,
        y: currentY - noteBoxH,
        width: contentWidth,
        height: noteBoxH,
        color: amberBg,
        borderColor: amberBorder,
        borderWidth: 0.8,
    });

    page.drawText(clean("Important Note: After releasing, it may take up to 72 hours to credit to your source account."), {
        x: startX + 12,
        y: currentY - noteBoxH + 7,
        size: 7.5,
        font: fonts.bold,
        color: amberText,
    });

    currentY -= (noteBoxH + 8);

    // ─── 7. REMARKS BOX ───
    const remarksText = slipData.notes || `Salary released for ${slipData.payPeriod || slipData.month}`;
    const remarksBoxH = 22;
    page.drawRectangle({
        x: startX,
        y: currentY - remarksBoxH,
        width: contentWidth,
        height: remarksBoxH,
        color: rgb(0.95, 0.97, 1.0),
        borderColor: rgb(0.85, 0.9, 0.98),
        borderWidth: 0.8,
    });

    page.drawText(clean(`Remarks: ${remarksText}`), {
        x: startX + 12,
        y: currentY - remarksBoxH + 7,
        size: 7.5,
        font: fonts.bold,
        color: primaryBlue,
    });

    currentY -= (remarksBoxH + 16);

    // ─── 8. FOOTER: SYSTEM DISCLAIMER ON LEFT, AUTHORIZED SIGNATORY ON RIGHT ───
    const footerY = 62;

    // Disclaimer
    const dis1 = "Note: This is a computer-generated salary statement issued by Engineers Parcel.";
    const dis2 = "It does not require a physical signature. For discrepancies, please notify the";
    const dis3 = "Accounts/HR Department within 5 working days.";
    page.drawText(dis1, { x: startX + 4, y: footerY + 22, size: 7, font: fonts.regular, color: textGray });
    page.drawText(dis2, { x: startX + 4, y: footerY + 12, size: 7, font: fonts.regular, color: textGray });
    page.drawText(dis3, { x: startX + 4, y: footerY + 2, size: 7, font: fonts.regular, color: textGray });

    // Right: Signature
    const sigPath = path.join(__dirname, "..", "public", "signature.png");
    const sigData = getAsset("signature", sigPath);
    if (sigData) {
        try {
            const sigImage = await pdfDoc.embedPng(sigData);
            const scaledSig = sigImage.scaleToFit(85, 32);
            page.drawImage(sigImage, {
                x: endX - 110,
                y: footerY + 16,
                width: scaledSig.width,
                height: scaledSig.height,
            });
        } catch (e) {
            console.error("Signature embed error:", e.message);
        }
    }

    page.drawText("Engineers Parcel", {
        x: endX - 110,
        y: footerY + 14,
        size: 8.5,
        font: fonts.bold,
        color: darkNavy,
    });
    page.drawText("Authorized Signatory", {
        x: endX - 110,
        y: footerY + 3,
        size: 7.5,
        font: fonts.regular,
        color: black,
    });
    page.drawText("Management", {
        x: endX - 110,
        y: footerY - 7,
        size: 7,
        font: fonts.regular,
        color: textGray,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

module.exports = {
    generateSalarySlipPDF,
    numberToWords,
};
