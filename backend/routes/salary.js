const express = require("express");
const router = express.Router();
const User = require("../models/User");
const SalarySlip = require("../models/SalarySlip");
const adminAuth = require("../middleware/adminAuth");
const { generateSalarySlipPDF, numberToWords } = require("../utils/salaryPdfService");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

// Create reusable Nodemailer transporter
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * @route   GET /api/salary/user/:id
 * @desc    Get user salary structure & previous payslips
 * @access  Admin
 */
router.get("/user/:id", adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password -plainPassword");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const recentSlips = await SalarySlip.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(12);

        res.json({
            user,
            recentSlips,
        });
    } catch (error) {
        console.error("Fetch user salary error:", error);
        res.status(500).json({ message: "Server error fetching salary profile" });
    }
});

/**
 * @route   POST /api/salary/calculate
 * @desc    Live calculation helper for salary slip preview
 * @access  Admin
 */
router.post("/calculate", adminAuth, async (req, res) => {
    try {
        const { earnings = [], deductions = [] } = req.body;

        const grossEarnings = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const netPay = Math.max(0, grossEarnings - totalDeductions);
        const netPayInWords = numberToWords(netPay);

        res.json({
            grossEarnings,
            totalDeductions,
            netPay,
            netPayInWords,
        });
    } catch (error) {
        res.status(500).json({ message: "Calculation error" });
    }
});

/**
 * @route   POST /api/salary/release
 * @desc    Generate Salary Slip, save to DB, generate PDF, and send to employee email
 * @access  Admin
 */
router.post("/release", adminAuth, async (req, res) => {
    try {
        const {
            userId,
            employeeId,
            month,
            payPeriod,
            payDate,
            workingDays = 30,
            paidDays = 30,
            lossOfPayDays = 0,
            earnings = [],
            deductions = [],
            notes = "",
            sendEmail = true,
            designation,
            department,
            bankDetails,
            updateUserDefault = false,
            baseSalary,
        } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Employee user record not found" });
        }

        // If admin opted to save base salary and designation as default for this employee profile
        if (updateUserDefault) {
            if (!user.salaryDetails) user.salaryDetails = {};
            if (typeof baseSalary !== "undefined") user.salaryDetails.basicSalary = Number(baseSalary) || 0;
            if (designation) user.designation = designation;
            await user.save();
        }

        // Calculate totals
        const grossEarnings = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const netPay = Math.max(0, grossEarnings - totalDeductions);
        const netPayInWords = numberToWords(netPay);

        const normalizedMonth = month || new Date().toISOString().slice(0, 7);
        const normalizedPayPeriod = payPeriod || new Date().toLocaleString("default", { month: "long", year: "numeric" });

        // Generate Slip Number: EP-SAL-YYYYMM-XXXX
        const cleanMonthCode = normalizedMonth.replace(/[^0-9]/g, "");
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const slipNumber = `EP-SAL-${cleanMonthCode}-${randCode}`;

        // Merged bank details
        const finalBankDetails = {
            bankName: bankDetails?.bankName || user.bankDetails?.bankName || "",
            accountNumber: bankDetails?.accountNumber || user.bankDetails?.accountNumber || "",
            ifscCode: bankDetails?.ifscCode || user.bankDetails?.ifscCode || "",
            panNumber: bankDetails?.panNumber || user.bankDetails?.panNumber || "",
            uanNumber: bankDetails?.uanNumber || user.bankDetails?.uanNumber || "",
        };

        const slipPayload = {
            slipNumber,
            employeeId: employeeId || user.username || slipNumber,
            userId: user._id,
            employeeName: user.name,
            employeeEmail: user.email || "",
            employeePhone: user.phone || "",
            designation: designation || user.designation || "Staff",
            department: department || user.department || "Operations",
            joiningDate: user.joiningDate || null,
            month: normalizedMonth,
            payPeriod: normalizedPayPeriod,
            payDate: payDate ? new Date(payDate) : new Date(),
            workingDays: Number(workingDays) || 30,
            paidDays: Number(paidDays) || 30,
            lossOfPayDays: Number(lossOfPayDays) || 0,
            earnings,
            deductions,
            grossEarnings,
            totalDeductions,
            netPay,
            netPayInWords,
            bankDetails: finalBankDetails,
            notes,
            releasedBy: req.admin?._id,
            status: "Released",
        };

        // Check if slip for this user and month already exists
        let existingSlip = await SalarySlip.findOne({ userId: user._id, month: normalizedMonth });
        let savedSlip;

        if (existingSlip) {
            // Update existing
            Object.assign(existingSlip, slipPayload);
            // Retain original slip number if desired or update
            savedSlip = await existingSlip.save();
        } else {
            savedSlip = new SalarySlip(slipPayload);
            await savedSlip.save();
        }

        // Generate official PDF buffer
        const pdfBuffer = await generateSalarySlipPDF(savedSlip.toObject());

        let emailSent = false;
        let emailError = null;

        // Send Email if employee has a registered email and sendEmail is true
        if (sendEmail) {
            if (!user.email) {
                console.warn(`⚠️ User ${user.name} does not have an email address registered.`);
            } else {
                try {
                    const transporter = getTransporter();
                    const safePeriod = normalizedPayPeriod.replace(/[^a-zA-Z0-9 ]/g, "");
                    const safeName = user.name.replace(/[^a-zA-Z0-9]/g, "_");
                    const pdfFileName = `SalarySlip_${safeName}_${safePeriod.replace(/ /g, "_")}.pdf`;

                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
                            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                            .header { background: #0c1c38; padding: 24px 30px; text-align: center; }
                            .header h2 { color: #ffffff; margin: 10px 0 0 0; font-size: 18px; letter-spacing: 0.5px; }
                            .header p { color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; }
                            .body-content { padding: 30px; }
                            .greeting { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
                            .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
                            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
                            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
                            .summary-row:last-child { border-bottom: none; }
                            .label { color: #64748b; font-weight: 500; }
                            .val { color: #0f172a; font-weight: 700; }
                            .highlight-net { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 24px; }
                            .net-title { font-size: 12px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 1px; }
                            .net-amount { font-size: 24px; font-weight: 800; color: #047857; margin-top: 4px; }
                            .words { font-size: 12px; color: #065f46; font-style: italic; margin-top: 2px; }
                            .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
                            .footer a { color: #0284c7; text-decoration: none; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="header">
                                <h2>SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED</h2>
                                <p>IIT (ISM) Dhanbad - 826004, Jharkhand, India</p>
                            </div>
                            <div class="body-content">
                                <div class="greeting">Dear ${user.name},</div>
                                <div class="intro">
                                    Your salary slip for the month of <strong>${normalizedPayPeriod}</strong> has been released. 
                                    Please find the official digitally generated payslip attached with this email for your records.
                                </div>
                                <div class="summary-box">
                                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                                        <tr>
                                            <td style="color: #64748b;">Payslip Number:</td>
                                            <td align="right" style="font-weight: 700; color: #0f172a;">${savedSlip.slipNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b;">Pay Period:</td>
                                            <td align="right" style="font-weight: 700; color: #0f172a;">${normalizedPayPeriod}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b;">Designation:</td>
                                            <td align="right" style="font-weight: 700; color: #0f172a;">${savedSlip.designation}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b;">Gross Earnings:</td>
                                            <td align="right" style="font-weight: 700; color: #0f172a;">₹ ${Number(grossEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #64748b;">Total Deductions:</td>
                                            <td align="right" style="font-weight: 700; color: #dc2626;">₹ ${Number(totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="highlight-net">
                                    <div class="net-title">Net Salary Transferred</div>
                                    <div class="net-amount">₹ ${Number(netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    <div class="words">(Rupees ${netPayInWords} Only)</div>
                                </div>
                                <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                                    If you have any questions regarding your salary computation, PF, or tax deductions, please reach out to the Accounts Department at <a href="mailto:info@engineersparcel.in">info@engineersparcel.in</a>.
                                </p>
                            </div>
                            <div class="footer">
                                <div>This is a confidential, system-generated notification from Engineers Parcel HR & Payroll.</div>
                                <div style="margin-top: 4px;">&copy; ${new Date().getFullYear()} SRQ Engineers Parcel and Haul Private Limited. All rights reserved.</div>
                            </div>
                        </div>
                    </body>
                    </html>
                    `;

                    await transporter.sendMail({
                        from: `"Engineers Parcel Payroll" <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: `Salary Slip for ${normalizedPayPeriod} - SRQ Engineers Parcel`,
                        html: emailHtml,
                        attachments: [
                            {
                                filename: pdfFileName,
                                content: pdfBuffer,
                                contentType: "application/pdf",
                            },
                        ],
                    });

                    emailSent = true;
                    savedSlip.emailSent = true;
                    savedSlip.emailedAt = new Date();
                    savedSlip.status = "Emailed";
                    await savedSlip.save();
                    console.log(`✅ Salary slip emailed successfully to ${user.email}`);
                } catch (err) {
                    console.error("❌ Failed to email salary slip:", err);
                    emailError = err.message;
                }
            }
        }

        res.json({
            success: true,
            slip: savedSlip,
            emailSent,
            emailError,
            message: emailSent
                ? `Salary released and payslip emailed directly to ${user.email}!`
                : user.email
                    ? `Salary released successfully (Email dispatch note: ${emailError || 'Email skipped'})`
                    : `Salary released successfully! (Note: Employee has no email registered)`,
        });
    } catch (error) {
        console.error("Release salary error:", error);
        res.status(500).json({ message: error.message || "Failed to release salary" });
    }
});

/**
 * @route   GET /api/salary/slip/:id/pdf
 * @desc    Download or view salary slip PDF
 * @access  Admin
 */
router.get("/slip/:id/pdf", adminAuth, async (req, res) => {
    try {
        const slip = await SalarySlip.findById(req.params.id);
        if (!slip) {
            return res.status(404).json({ message: "Salary slip not found" });
        }

        const pdfBuffer = await generateSalarySlipPDF(slip.toObject());
        const safeName = slip.employeeName.replace(/[^a-zA-Z0-9]/g, "_");
        const safePeriod = slip.payPeriod.replace(/[^a-zA-Z0-9]/g, "_");
        const filename = `SalarySlip_${safeName}_${safePeriod}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Salary PDF generation error:", error);
        res.status(500).json({ message: "Error generating salary slip PDF" });
    }
});

/**
 * @route   GET /api/salary/history
 * @desc    Get all released salary slips
 * @access  Admin
 */
router.get("/history", adminAuth, async (req, res) => {
    try {
        const { month, search } = req.query;
        let query = {};

        if (month) {
            query.month = month;
        }

        if (search) {
            query.$or = [
                { employeeName: { $regex: search, $options: "i" } },
                { employeeEmail: { $regex: search, $options: "i" } },
                { slipNumber: { $regex: search, $options: "i" } },
            ];
        }

        const slips = await SalarySlip.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(slips);
    } catch (error) {
        console.error("Fetch salary history error:", error);
        res.status(500).json({ message: "Server error fetching salary slips" });
    }
});

module.exports = router;

