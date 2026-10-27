const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Vendor = require("../models/Partner"); // We'll keep the variable Vendor for now so we don't have to rename everything in this file, but require Partner model
const Counter = require("../models/Counter");
const adminAuth = require("../middleware/adminAuth");
const Booking = require("../models/Booking");
const VendorPayment = require("../models/VendorPayment");
const ExcelJS = require("exceljs");

// Helper function to parse IST-aware date ranges (UTC+05:30)
function getFilterDateRange(query) {
    const { month, startDate, endDate, filterType } = query;
    if (filterType === 'all') {
        return null;
    }

    // Custom date range
    if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00.000+05:30`);
        const end = new Date(`${endDate}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return { start, end, type: 'custom', startDate, endDate };
        }
    } else if (startDate && !endDate) {
        const start = new Date(`${startDate}T00:00:00.000+05:30`);
        const end = new Date(`${startDate}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime())) {
            return { start, end, type: 'custom', startDate, endDate: startDate };
        }
    }

    // Month filter (format: YYYY-MM)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, m] = month.split('-').map(Number);
        const start = new Date(`${month}-01T00:00:00.000+05:30`);
        const lastDay = new Date(year, m, 0).getDate();
        const lastDayStr = String(lastDay).padStart(2, '0');
        const end = new Date(`${month}-${lastDayStr}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return { start, end, type: 'month', month };
        }
    }

    return null;
}

// GET all vendors
router.get("/", adminAuth, async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 });
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper: Generate structured month-by-month corporate partner GST data
async function generateMonthlyGstData(queryParams) {
    const fyParam = queryParams.financialYear || "2026-2027";
    const scope = queryParams.scope || "all_corporate"; // "all_corporate" or "registered_only"
    const companyKey = queryParams.company || "SRQ";

    let startYear = 2026;
    let endYear = 2027;
    if (fyParam && /^\d{4}-\d{4}$/.test(fyParam)) {
        const parts = fyParam.split("-").map(Number);
        startYear = parts[0];
        endYear = parts[1];
    }

    const fyStart = new Date(`${startYear}-04-01T00:00:00.000+05:30`);
    const fyEnd = new Date(`${endYear}-03-31T23:59:59.999+05:30`);

    const partners = await Vendor.find().lean();
    const partnerById = new Map();
    const partnerByName = new Map();

    partners.forEach(p => {
        if (p.partnerId) partnerById.set(p.partnerId.toUpperCase(), p);
        if (p.vendorId) partnerById.set(p.vendorId.toUpperCase(), p);
        partnerById.set(String(p._id), p);
        if (p.name) partnerByName.set(p.name.trim().toLowerCase(), p);
    });

    const monthDefs = [
        { name: "APRIL", monthNum: 4, year: startYear },
        { name: "MAY", monthNum: 5, year: startYear },
        { name: "JUNE", monthNum: 6, year: startYear },
        { name: "JULY", monthNum: 7, year: startYear },
        { name: "AUGUST", monthNum: 8, year: startYear },
        { name: "SEPTEMBER", monthNum: 9, year: startYear },
        { name: "OCTOBER", monthNum: 10, year: startYear },
        { name: "NOVEMBER", monthNum: 11, year: startYear },
        { name: "DECEMBER", monthNum: 12, year: startYear },
        { name: "JANUARY", monthNum: 1, year: endYear },
        { name: "FEBRUARY", monthNum: 2, year: endYear },
        { name: "MARCH", monthNum: 3, year: endYear },
    ];

    const allBookings = await Booking.find({
        createdAt: { $gte: fyStart, $lte: fyEnd }
    }).sort({ createdAt: 1 }).lean();

    const invoicePrefix = `INV/${String(startYear).slice(-2)}-${String(endYear).slice(-2)}/`;
    let invoiceCounter = 1;

    const monthsResult = [];
    let grandTotalQty = 0;
    let grandTotalWeight = 0;
    let grandTotalTaxableAmount = 0;
    let grandTotalGstAmount = 0;
    let grandTotalInvoiceValue = 0;

    const isCorporateRegex = /(m\/s|pvt|ltd|limited|foundation|hospital|solutions|technologies|store|insurance|enterprises|engineering|llp|inc|equip|cure|volvo|hyundai)/i;

    for (const mDef of monthDefs) {
        const monthStr = String(mDef.monthNum).padStart(2, "0");
        const monthKey = `${mDef.year}-${monthStr}`;
        const monthDisplayName = `${mDef.name} ${mDef.year}`;
        const lastDay = new Date(mDef.year, mDef.monthNum, 0).getDate();

        const mStart = new Date(`${mDef.year}-${monthStr}-01T00:00:00.000+05:30`);
        const mEnd = new Date(`${mDef.year}-${monthStr}-${String(lastDay).padStart(2, "0")}T23:59:59.999+05:30`);

        const monthBookings = allBookings.filter(b => {
            const d = new Date(b.createdAt);
            return d >= mStart && d <= mEnd;
        });

        const groups = new Map();

        for (const b of monthBookings) {
            let partner = null;
            if (b.partnerId && partnerById.has(b.partnerId.toUpperCase())) {
                partner = partnerById.get(b.partnerId.toUpperCase());
            } else if (b.vendorId && partnerById.has(b.vendorId.toUpperCase())) {
                partner = partnerById.get(b.vendorId.toUpperCase());
            } else {
                const sName = (b.senderDetails?.name || b.partnerName || "").trim();
                if (sName) {
                    for (const [pName, pObj] of partnerByName.entries()) {
                        if (sName.toLowerCase().includes(pName) || pName.includes(sName.toLowerCase())) {
                            partner = pObj;
                            break;
                        }
                    }
                }
            }

            if (scope === "registered_only" && !partner) {
                continue;
            }

            const senderName = (b.senderDetails?.name || b.partnerName || "").trim();
            const isCorporate = !!partner ||
                (b.partnerId && b.partnerId !== "null" && b.partnerId !== "undefined") ||
                (b.partnerName && b.partnerName !== "null" && b.partnerName !== "undefined") ||
                isCorporateRegex.test(senderName);

            if (!isCorporate) continue;

            const groupKey = partner ? partner.partnerId : (b.partnerName || senderName || "Corporate Customer");
            const partnerName = partner ? partner.name : (b.partnerName || senderName);
            const gstNumber = partner?.gstNumber || "B2C / URP";

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    partnerId: partner?.partnerId || b.partnerId || "",
                    billTo: partnerName,
                    gstNumber: gstNumber,
                    phone: partner?.phone || b.senderDetails?.phone || "",
                    email: partner?.email || b.senderDetails?.email || "",
                    address: partner?.address || "",
                    city: partner?.city || b.senderDetails?.city || "",
                    state: partner?.state || b.senderDetails?.state || "",
                    pincode: partner?.pincode || b.senderDetails?.pincode || "",
                    bookings: []
                });
            }
            groups.get(groupKey).bookings.push(b);
        }

        const sortedGroups = Array.from(groups.values()).sort((a, b) => {
            const dateA = Math.min(...a.bookings.map(x => new Date(x.createdAt).getTime()));
            const dateB = Math.min(...b.bookings.map(x => new Date(x.createdAt).getTime()));
            return dateA - dateB;
        });

        const rows = [];
        let monthTotalQty = 0;
        let monthTotalWeight = 0;
        let monthTotalTaxable = 0;
        let monthTotalGst = 0;
        let monthTotalValue = 0;

        sortedGroups.forEach((g, index) => {
            const qty = g.bookings.length;
            let totalWeight = g.bookings.reduce((sum, b) => {
                let w = Number(b.packageDetails?.weight) || Number(b.pricing?.chargeableWeight) || 0;
                if (w > 5000) w = w / 1000;
                return sum + w;
            }, 0);
            totalWeight = Math.round(totalWeight * 100) / 100;

            const totalInvoiceValue = g.bookings.reduce((sum, b) => sum + (Number(b.pricing?.totalAmount) || 0), 0);
            const taxableAmount = Math.round((totalInvoiceValue / 1.18) * 100) / 100;
            const gstAmount = Math.round((totalInvoiceValue - taxableAmount) * 100) / 100;

            const dates = g.bookings.map(b => new Date(b.createdAt)).sort((a, b) => a - b);
            const firstDate = dates[0] || new Date();
            const lastDate = dates[dates.length - 1] || new Date();
            const invDateStr = `${firstDate.getDate()}/${firstDate.getMonth() + 1}/${String(firstDate.getFullYear()).slice(-2)}`;
            const invDateIso = firstDate.toISOString().slice(0, 10);

            const invNo = `${invoicePrefix}${String(invoiceCounter++).padStart(2, "0")}`;

            monthTotalQty += qty;
            monthTotalWeight += totalWeight;
            monthTotalTaxable += taxableAmount;
            monthTotalGst += gstAmount;
            monthTotalValue += totalInvoiceValue;

            rows.push({
                sNo: index + 1,
                partnerId: g.partnerId,
                billTo: g.billTo,
                gstNumber: g.gstNumber,
                invoiceNo: invNo,
                invoiceDate: invDateStr,
                invoiceDateIso: invDateIso,
                period: `${firstDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${lastDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
                qty,
                weight: totalWeight,
                taxableAmount: Math.round(taxableAmount * 100) / 100,
                gstRate: "18%",
                gstAmount: Math.round(gstAmount * 100) / 100,
                invoiceValue: Math.round(totalInvoiceValue * 100) / 100,
                bookings: g.bookings.map(b => ({
                    _id: b._id,
                    bookingId: b.bookingId,
                    trackingId: b.trackingId || b.bookingId,
                    createdAt: b.createdAt,
                    dateFormatted: new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                    sender: b.senderDetails?.name || "N/A",
                    receiver: b.receiverDetails?.name || "N/A",
                    origin: b.senderDetails?.city || "Dhanbad",
                    destination: b.receiverDetails?.city || b.receiverDetails?.state || "India",
                    weight: b.packageDetails?.weight || 0,
                    amount: b.pricing?.totalAmount || 0,
                    status: b.status || "Booked",
                    paymentStatus: b.vendorPaymentStatus || "Pending"
                }))
            });
        });

        monthTotalWeight = Math.round(monthTotalWeight * 100) / 100;
        monthTotalTaxable = Math.round(monthTotalTaxable * 100) / 100;
        monthTotalGst = Math.round(monthTotalGst * 100) / 100;
        monthTotalValue = Math.round(monthTotalValue * 100) / 100;

        grandTotalQty += monthTotalQty;
        grandTotalWeight += monthTotalWeight;
        grandTotalTaxableAmount += monthTotalTaxable;
        grandTotalGstAmount += monthTotalGst;
        grandTotalInvoiceValue += monthTotalValue;

        monthsResult.push({
            monthKey,
            monthName: mDef.name,
            year: mDef.year,
            sheetName: monthDisplayName,
            titleBanner: `SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED (${monthDisplayName})`,
            orderCount: monthBookings.length,
            partnerCount: rows.length,
            rows,
            totals: {
                qty: monthTotalQty,
                weight: monthTotalWeight,
                taxableAmount: monthTotalTaxable,
                gstRate: "18%",
                gstAmount: monthTotalGst,
                invoiceValue: monthTotalValue
            }
        });
    }

    return {
        financialYear: fyParam,
        startYear,
        endYear,
        scope,
        fileName: `GST (${companyKey}) APR ${startYear}-MAR ${endYear} .xlsx`,
        company: {
            name: companyKey === "ENGGPARCEL" ? "ENGGPARCEL SERVICES LLP" : "SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED",
            shortName: companyKey === "ENGGPARCEL" ? "EnggParcel Services" : "Engineers Parcel",
            gstin: companyKey === "ENGGPARCEL" ? "20AAQFE4312Q1ZX" : "20AAHCS7825E1ZY",
            cin: companyKey === "ENGGPARCEL" ? "AAZ-3942" : "U63090JH2023PTC020726",
            address: "IIT (ISM) Dhanbad, Sardar Patel Nagar, Dhanbad - 826004, Jharkhand, India",
            phone: "+91 9708815717 / 9525801506",
            email: "info@engineersparcel.in"
        },
        months: monthsResult,
        fyTotals: {
            grandTotalQty,
            grandTotalWeight: Math.round(grandTotalWeight * 100) / 100,
            grandTotalTaxableAmount: Math.round(grandTotalTaxableAmount * 100) / 100,
            grandTotalGstAmount: Math.round(grandTotalGstAmount * 100) / 100,
            grandTotalInvoiceValue: Math.round(grandTotalInvoiceValue * 100) / 100,
            totalInvoicesIssued: invoiceCounter - 1
        }
    };
}

// Helper: Build ExcelJS worksheet with centered bold title banner and Light Orange 3 bold headers
function createExcelJsWorksheet(workbook, monthData, company) {
    const ws = workbook.addWorksheet(monthData.sheetName, {
        views: [{ showGridLines: true }]
    });

    ws.columns = [
        { key: "sNo", width: 9 },
        { key: "billTo", width: 38 },
        { key: "b2b_b2c", width: 24 },
        { key: "invoiceNo", width: 18 },
        { key: "invoiceDate", width: 16 },
        { key: "qty", width: 10 },
        { key: "weight", width: 14 },
        { key: "taxableAmount", width: 20 },
        { key: "gstRate", width: 12 },
        { key: "gstAmount", width: 18 },
        { key: "invoiceValue", width: 20 }
    ];

    // Row 1: Merged Title Banner - CENTER AND BOLD FORMAT
    ws.mergeCells("A1:K1");
    const titleRow = ws.getRow(1);
    titleRow.height = 36;
    const titleCell = ws.getCell("A1");
    titleCell.value = `${company.name.toUpperCase()} (${monthData.sheetName})`;
    titleCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" }
    };
    titleCell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
    };

    // Row 2: Column Headers - LIGHT ORANGE 3 AND ALL LETTERS IN BOLD
    const LIGHT_ORANGE_3 = "FFF8CBAD"; // Excel Theme Light Orange 3
    const headers = [
        "S NO.", "BILL TO", "B2B/B2C", "INVOICE NO.", "INVOICE DATE",
        "QTY.", "WT. (kg)", "TAXABLE AMOUNT", "GST RATE", "GST AMOUNT", "INVOICE VALUE"
    ];

    const headerRow = ws.getRow(2);
    headerRow.height = 28;
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_ORANGE_3 }
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } }
        };
    });

    // Rows 3..N: Data Rows
    monthData.rows.forEach((r) => {
        const row = ws.addRow([
            r.sNo,
            r.billTo,
            r.gstNumber,
            r.invoiceNo,
            r.invoiceDate,
            r.qty,
            r.weight,
            r.taxableAmount,
            r.gstRate,
            r.gstAmount,
            r.invoiceValue
        ]);
        row.height = 22;

        row.eachCell((cell, colNum) => {
            const isBold = colNum === 2 || colNum === 3 || colNum === 11;
            cell.font = { name: "Calibri", size: 10, bold: isBold };
            cell.border = {
                top: { style: "thin", color: { argb: "FFD9D9D9" } },
                left: { style: "thin", color: { argb: "FF000000" } },
                bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
                right: { style: "thin", color: { argb: "FF000000" } }
            };

            if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 6 || colNum === 9) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if (colNum === 2 || colNum === 3) {
                cell.alignment = { horizontal: "left", vertical: "middle" };
            } else {
                cell.alignment = { horizontal: "right", vertical: "middle" };
                if (colNum === 7 || colNum === 8 || colNum === 10 || colNum === 11) {
                    cell.numFmt = "#,##0.00";
                }
            }
        });
    });

    // Total Row
    const totalRow = ws.addRow([
        "TOTAL",
        "",
        "",
        "",
        "",
        monthData.totals.qty,
        monthData.totals.weight,
        monthData.totals.taxableAmount,
        monthData.totals.gstRate,
        monthData.totals.gstAmount,
        monthData.totals.invoiceValue
    ]);
    totalRow.height = 26;
    ws.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

    totalRow.eachCell((cell, colNum) => {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
        cell.border = {
            top: { style: "medium", color: { argb: "FF000000" } },
            bottom: { style: "double", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } }
        };
        if (colNum <= 5 || colNum === 6 || colNum === 9) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            if (colNum === 7 || colNum === 8 || colNum === 10 || colNum === 11) {
                cell.numFmt = "#,##0.00";
            }
        }
    });

    return ws;
}

// GET Monthly GST Report for all Corporate Partners Month-by-Month (JSON)
router.get("/reports/monthly-gst", adminAuth, async (req, res) => {
    try {
        const report = await generateMonthlyGstData(req.query);
        res.json(report);
    } catch (err) {
        console.error("Monthly GST report error:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET Styled XLSX File Download directly from backend (ExcelJS)
router.get("/reports/monthly-gst/download-xlsx", adminAuth, async (req, res) => {
    try {
        const report = await generateMonthlyGstData(req.query);
        const { downloadType, month } = req.query;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = report.company.shortName || "Engineers Parcel";
        workbook.created = new Date();

        let exportFileName = report.fileName;

        if (downloadType === "month" && month) {
            const targetMonth = report.months.find(m => m.monthKey === month) || report.months[0];
            createExcelJsWorksheet(workbook, targetMonth, report.company);
            exportFileName = `GST (${req.query.company || "SRQ"}) ${targetMonth.sheetName}.xlsx`;
        } else {
            report.months.forEach(m => {
                createExcelJsWorksheet(workbook, m, report.company);
            });
        }

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(exportFileName)}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Monthly GST Excel export error:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET single vendor
router.get("/:id", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });
        res.json(vendor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH vendors - Empty query returns recent vendors
router.get("/search", adminAuth, async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 }).limit(20);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH vendors by ID, Name, Phone, City, or Email
router.get("/search/:query", adminAuth, async (req, res) => {
    try {
        const query = req.params.query;
        const vendors = await Vendor.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { partnerId: { $regex: query, $options: "i" } },
                { phone: { $regex: query, $options: "i" } },
                { city: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
                { gstNumber: { $regex: query, $options: "i" } },
            ],
        }).limit(20);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// CREATE vendor
router.post("/", adminAuth, async (req, res) => {
    try {
        const data = { ...req.body };
        
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        // Auto-generate API key if not provided
        if (!data.apiKey) {
            data.apiKey = "ep_live_" + require('crypto').randomBytes(16).toString('hex');
        }

        if (!data.partnerId) {
            // Find highest existing PAT ID to guarantee contiguous numbering without skipping
            const lastPartner = await Vendor.findOne({ partnerId: /^PAT\d+$/ })
                .sort({ partnerId: -1 })
                .collation({ locale: "en_US", numericOrdering: true });
                
            let maxSeq = 0;
            if (lastPartner && lastPartner.partnerId) {
                const lastIdStr = lastPartner.partnerId.replace('PAT', '');
                const lastIdNum = parseInt(lastIdStr, 10);
                if (!isNaN(lastIdNum)) {
                    maxSeq = lastIdNum;
                }
            }

            const nextSeq = maxSeq + 1;
            data.partnerId = `PAT${String(nextSeq).padStart(4, '0')}`;

            // Keep Counter synchronized
            await Counter.findOneAndUpdate(
                { id: "partnerId" },
                { $set: { seq: nextSeq } },
                { upsert: true }
            );
        }
        
        if (!data.vendorId && data.partnerId) {
            data.vendorId = data.partnerId;
        }

        const vendor = new Vendor(data);
        const newVendor = await vendor.save();
        res.status(201).json(newVendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE vendor
router.put("/:id", adminAuth, async (req, res) => {
    try {
        let updateData = { ...req.body };
        let updateQuery = { $set: updateData };

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
            // Remove password from update if it's empty to prevent un-setting it
            delete updateData.password;
        }

        if (updateData.apiKey === "") {
            delete updateData.apiKey;
            updateQuery.$unset = { apiKey: 1 };
        }

        const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, updateQuery, { new: true });
        res.json(updatedVendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE vendor
// GET all orders for a specific vendor
router.get("/:id/orders", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const partnerIds = [vendor.partnerId, vendor.vendorId, String(vendor._id)].filter(Boolean);
        const query = {
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        };

        const range = getFilterDateRange(req.query);
        if (range) {
            query.createdAt = {
                $gte: range.start,
                $lte: range.end
            };
        }

        const bookings = await Booking.find(query).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE payment details for a specific vendor order
router.put("/order/:orderId/payment", adminAuth, async (req, res) => {
    try {
        const { vendorPaidAmount, vendorPaymentMethod, vendorReceivedBy, vendorPaymentDate, totalAmount, newPaymentAmount } = req.body;
        
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        // Update amounts
        if (totalAmount !== undefined) {
            booking.pricing.totalAmount = totalAmount;
        }
        
        booking.vendorPaidAmount = vendorPaidAmount;
        booking.vendorPaymentMethod = vendorPaymentMethod;
        booking.vendorReceivedBy = vendorReceivedBy;
        booking.vendorPaymentDate = vendorPaymentDate || Date.now();
        
        // Determine status
        const due = (totalAmount || booking.pricing.totalAmount) - vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        // Log payment history if there is a new payment
        if (newPaymentAmount && Number(newPaymentAmount) > 0) {
            if (!booking.vendorPaymentHistory) {
                booking.vendorPaymentHistory = [];
            }
            booking.vendorPaymentHistory.push({
                amount: Number(newPaymentAmount),
                method: vendorPaymentMethod,
                receivedBy: vendorReceivedBy,
                date: vendorPaymentDate || Date.now(),
                notes: "Incremental Payment Added"
            });
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// EDIT a specific payment history record for an order
router.put("/order/:orderId/history/:historyId", adminAuth, async (req, res) => {
    try {
        const { amount, method, receivedBy, date } = req.body;
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        const historyItem = booking.vendorPaymentHistory.id(req.params.historyId);
        if (!historyItem) return res.status(404).json({ message: "History record not found" });

        if (amount !== undefined) historyItem.amount = Number(amount);
        if (method !== undefined) historyItem.method = method;
        if (receivedBy !== undefined) historyItem.receivedBy = receivedBy;
        if (date !== undefined) historyItem.date = date;

        // Recalculate total vendorPaidAmount based on history
        booking.vendorPaidAmount = booking.vendorPaymentHistory.reduce((sum, item) => sum + item.amount, 0);

        // Update status
        const due = (booking.pricing.totalAmount || 0) - booking.vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (booking.vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE a specific payment history record for an order
router.delete("/order/:orderId/history/:historyId", adminAuth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        booking.vendorPaymentHistory.pull(req.params.historyId);

        // Recalculate total vendorPaidAmount based on history
        booking.vendorPaidAmount = booking.vendorPaymentHistory.reduce((sum, item) => sum + item.amount, 0);

        // Update status
        const due = (booking.pricing.totalAmount || 0) - booking.vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (booking.vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET financial summary for a vendor (Monthly/Custom/Total)
router.get("/:id/finances", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const partnerIds = [vendor.partnerId, vendor.vendorId, String(vendor._id)].filter(Boolean);
        const bookingQuery = {
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        };

        const paymentQuery = {
            $or: [
                { vendorId: { $in: partnerIds } },
                { partnerId: { $in: partnerIds } }
            ]
        };

        const range = getFilterDateRange(req.query);
        if (range) {
            bookingQuery.createdAt = {
                $gte: range.start,
                $lte: range.end
            };

            if (range.type === 'month') {
                paymentQuery.$or = [
                    { month: range.month },
                    { paymentDate: { $gte: range.start, $lte: range.end } }
                ];
            } else if (range.type === 'custom') {
                paymentQuery.paymentDate = {
                    $gte: range.start,
                    $lte: range.end
                };
            }
        }

        const bookings = await Booking.find(bookingQuery);
        const payments = await VendorPayment.find(paymentQuery);

        const totalDue = bookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
        const totalPaidOnOrders = bookings.reduce((sum, b) => sum + (b.vendorPaidAmount || 0), 0);
        const totalBulkPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // All-Time Summary for reference
        const allTimeBookings = await Booking.find({
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        });
        const allTimePayments = await VendorPayment.find({
            $or: [
                { vendorId: { $in: partnerIds } },
                { partnerId: { $in: partnerIds } }
            ]
        });

        const allTimeTotalDue = allTimeBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
        const allTimePaidOnOrders = allTimeBookings.reduce((sum, b) => sum + (b.vendorPaidAmount || 0), 0);
        const allTimeBulkPayments = allTimePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({
            totalDue,
            totalPaidOnOrders,
            totalBulkPayments,
            netBalance: totalDue - (totalPaidOnOrders + totalBulkPayments),
            bookingCount: bookings.length,
            filterRange: range ? {
                start: range.start,
                end: range.end,
                type: range.type,
                label: range.type === 'month' ? range.month : `${range.startDate} to ${range.endDate}`
            } : { type: 'all', label: 'All Time' },
            allTime: {
                totalDue: allTimeTotalDue,
                totalPaid: allTimePaidOnOrders + allTimeBulkPayments,
                netBalance: allTimeTotalDue - (allTimePaidOnOrders + allTimeBulkPayments),
                bookingCount: allTimeBookings.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/:id", adminAuth, async (req, res) => {
    try {
        await Vendor.findByIdAndDelete(req.params.id);
        res.json({ message: "Vendor deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
