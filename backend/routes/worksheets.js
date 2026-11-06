const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const WorksheetTemplate = require("../models/WorksheetTemplate");
const DailyWorksheet = require("../models/DailyWorksheet");
const User = require("../models/User");
const Admin = require("../models/Admin");
const ExcelJS = require("exceljs");

// Default fields matching Google Sheet screenshot
const DEFAULT_FIELDS = [
  {
    key: "newLeads",
    label: "New leads received",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 1,
  },
  {
    key: "leadsCalled",
    label: "Leads called within 30 min",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 2,
  },
  {
    key: "leadsPassedSabir",
    label: "Leads passed to Sabir (B2B)",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 3,
  },
  {
    key: "ordersClosed",
    label: "Small orders closed by me",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 4,
  },
  {
    key: "ordersTracked",
    label: "Orders tracked & updated in dashboard",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 5,
  },
  {
    key: "satisfactionCalls",
    label: "Satisfaction calls done",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 6,
  },
  {
    key: "quoteFollowup",
    label: "Quote follow-up calls",
    type: "number",
    placeholder: "0",
    summaryType: "sum",
    order: 7,
  },
  {
    key: "shiftingNotes",
    label: "Shifting / Field Work (Hours / Notes)",
    type: "text",
    placeholder: "e.g. Warehouse shifting 11am-3pm",
    summaryType: "none",
    order: 8,
  },
  {
    key: "biggestProblem",
    label: "Biggest problem today (1 line)",
    type: "text",
    placeholder: "e.g. Customer not picking call at Hirapur",
    summaryType: "none",
    order: 9,
  },
];

// Helper to ensure a default template exists
async function getOrCreateDefaultTemplate() {
  let template = await WorksheetTemplate.findOne({ isDefault: true, isActive: true });
  if (!template) {
    template = await WorksheetTemplate.findOne({ isActive: true });
  }
  if (!template) {
    template = await WorksheetTemplate.create({
      title: "DAILY WORK LOG",
      designation: "Operations & Customer Relations Executive",
      companyName: "Engineers Parcel",
      instructions:
        "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.",
      isDefault: true,
      isActive: true,
      applicableRoles: ["staff", "agent", "admin"],
      fields: DEFAULT_FIELDS,
    });
  }
  return template;
}

// Helper to calculate month days structure
function generateMonthDays(yearMonth) {
  // yearMonth format: "YYYY-MM"
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-based
  
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthShort = monthNames[monthIndex];

  const entries = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = dayNames[d.getDay()];
    const padDay = String(day).padStart(2, "0");
    const displayDate = `${padDay}-${monthShort}`;
    const fullDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${padDay}`;

    entries.push({
      dayNumber: day,
      date: fullDate,
      displayDate: displayDate,
      dayOfWeek: dayOfWeek,
      status: dayOfWeek === "Sun" ? "Weekly Off" : "",
      values: {},
      isFilled: false,
    });
  }

  const monthStartDate = `01-${monthShort}-${year}`;
  return { daysInMonth, monthStartDate, entries };
}

// Compute summary stats for a worksheet
function computeWorksheetSummary(worksheet, templateFields) {
  const summary = {
    totalDays: worksheet.daysInMonth || worksheet.entries.length,
    daysPresent: 0,
    daysLeave: 0,
    daysHalfDay: 0,
    daysWeeklyOff: 0,
    daysHoliday: 0,
    filledDaysCount: 0,
    fieldTotals: {},
  };

  // Initialize field totals
  templateFields.forEach((field) => {
    if (field.summaryType === "sum" || field.summaryType === "average") {
      summary.fieldTotals[field.key] = 0;
    }
  });

  worksheet.entries.forEach((entry) => {
    if (entry.status === "Present") summary.daysPresent++;
    else if (entry.status === "Leave") summary.daysLeave++;
    else if (entry.status === "Half Day") summary.daysHalfDay++;
    else if (entry.status === "Weekly Off") summary.daysWeeklyOff++;
    else if (entry.status === "Holiday") summary.daysHoliday++;

    if (entry.isFilled) summary.filledDaysCount++;

    if (entry.values) {
      templateFields.forEach((field) => {
        if (field.summaryType === "sum" || field.summaryType === "average") {
          const val = parseFloat(entry.values[field.key]);
          if (!isNaN(val)) {
            summary.fieldTotals[field.key] = (summary.fieldTotals[field.key] || 0) + val;
          }
        }
      });
    }
  });

  // Calculate averages where appropriate
  templateFields.forEach((field) => {
    if (field.summaryType === "average" && summary.daysPresent > 0) {
      summary.fieldTotals[field.key] = parseFloat(
        (summary.fieldTotals[field.key] / summary.daysPresent).toFixed(1)
      );
    }
  });

  summary.completionPercentage = summary.totalDays > 0
    ? Math.round((summary.filledDaysCount / summary.totalDays) * 100)
    : 0;

  return summary;
}

// -------------------------------------------------------------
// TEMPLATE ROUTES
// -------------------------------------------------------------

// GET /api/worksheets/templates - Get all templates
router.get("/templates", authMiddleware, async (req, res) => {
  try {
    await getOrCreateDefaultTemplate();
    const templates = await WorksheetTemplate.find({ isActive: true })
      .populate("assignedUserIds", "name username email role")
      .sort({ createdAt: -1 });

    res.json({ success: true, templates });
  } catch (err) {
    console.error("Error fetching worksheet templates:", err);
    res.status(500).json({ success: false, message: "Failed to fetch templates", error: err.message });
  }
});

// POST /api/worksheets/templates - Create new template (Admin only)
router.post("/templates", authMiddleware, async (req, res) => {
  try {
    const { title, designation, companyName, instructions, fields, assignedUserIds, applicableRoles, isDefault } = req.body;

    if (!title || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: "Title and fields array are required" });
    }

    if (isDefault) {
      await WorksheetTemplate.updateMany({}, { isDefault: false });
    }

    const template = await WorksheetTemplate.create({
      title,
      designation: designation || "Operations & Customer Relations Executive",
      companyName: companyName || "Engineers Parcel",
      instructions: instructions || "YELLOW cells = you fill. Fill ONCE at day end.",
      fields,
      assignedUserIds: assignedUserIds || [],
      applicableRoles: applicableRoles || ["staff"],
      isDefault: !!isDefault,
      isActive: true,
      createdBy: req.admin ? req.admin._id : (req.user ? req.user._id : null),
    });

    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error("Error creating template:", err);
    res.status(500).json({ success: false, message: "Failed to create template", error: err.message });
  }
});

// PUT /api/worksheets/templates/:id - Update template (Admin only)
router.put("/templates/:id", authMiddleware, async (req, res) => {
  try {
    const { title, designation, companyName, instructions, fields, assignedUserIds, applicableRoles, isDefault } = req.body;

    if (isDefault) {
      await WorksheetTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const updated = await WorksheetTemplate.findByIdAndUpdate(
      req.params.id,
      {
        title,
        designation,
        companyName,
        instructions,
        fields,
        assignedUserIds,
        applicableRoles,
        ...(typeof isDefault === "boolean" ? { isDefault } : {}),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Also update current worksheets for assigned users so they get the latest designation & fields
    if (assignedUserIds && assignedUserIds.length > 0) {
      await DailyWorksheet.updateMany(
        { user: { $in: assignedUserIds } },
        { template: updated._id, staffRole: updated.designation }
      );
    }

    res.json({ success: true, template: updated });
  } catch (err) {
    console.error("Error updating template:", err);
    res.status(500).json({ success: false, message: "Failed to update template", error: err.message });
  }
});

// DELETE /api/worksheets/templates/:id - Delete template (Admin only)
router.delete("/templates/:id", authMiddleware, async (req, res) => {
  try {
    const template = await WorksheetTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    if (template.isDefault) {
      return res.status(400).json({ success: false, message: "Cannot delete the default template" });
    }

    await WorksheetTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Template removed successfully" });
  } catch (err) {
    console.error("Error deleting template:", err);
    res.status(500).json({ success: false, message: "Failed to delete template" });
  }
});

// POST /api/worksheets/assign-staff-template - Quick assign template to staff member
router.post("/assign-staff-template", authMiddleware, async (req, res) => {
  try {
    const { templateId, userId } = req.body;
    if (!templateId || !userId) {
      return res.status(400).json({ success: false, message: "templateId and userId are required" });
    }

    const template = await WorksheetTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Remove user from any other template's assignedUserIds
    await WorksheetTemplate.updateMany(
      { _id: { $ne: templateId } },
      { $pull: { assignedUserIds: userId } }
    );

    // Add user to this template if not already present
    if (!template.assignedUserIds.map((id) => String(id)).includes(String(userId))) {
      template.assignedUserIds.push(userId);
      await template.save();
    }

    // Update existing worksheets for this user to point to this template
    await DailyWorksheet.updateMany(
      { user: userId },
      { template: template._id, staffRole: template.designation }
    );

    res.json({ success: true, message: "Template assigned to staff successfully", template });
  } catch (err) {
    console.error("Error assigning staff template:", err);
    res.status(500).json({ success: false, message: "Failed to assign template", error: err.message });
  }
});

// -------------------------------------------------------------
// STAFF LIST ROUTE (FOR DROPDOWN)
// -------------------------------------------------------------
router.get("/staff-list", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({
      isActive: true,
      role: { $in: ["staff", "agent", "admin", "office_admin"] },
    })
      .select("_id name username email role")
      .sort({ name: 1 });

    res.json({ success: true, staff: users });
  } catch (err) {
    console.error("Error fetching staff list:", err);
    res.status(500).json({ success: false, message: "Failed to fetch staff list" });
  }
});

// -------------------------------------------------------------
// MONTHLY WORKSHEET ROUTES
// -------------------------------------------------------------

// GET /api/worksheets/monthly - Fetch or auto-initialize monthly worksheet
router.get("/monthly", authMiddleware, async (req, res) => {
  try {
    const defaultTemplate = await getOrCreateDefaultTemplate();

    // Determine target user
    let targetUserId = req.query.userId;
    const isAdmin = !!req.admin || req.user?.role === "admin";

    if (!isAdmin || !targetUserId) {
      // If regular user or no specific target passed, default to caller
      targetUserId = req.admin ? req.admin._id : req.user?._id;
    }

    // Determine month (default: current month in YYYY-MM)
    let month = req.query.month;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    // Find target user details
    let targetUser = await User.findById(targetUserId);
    if (!targetUser && req.admin && String(req.admin._id) === String(targetUserId)) {
      targetUser = {
        _id: req.admin._id,
        name: req.admin.username || "Admin",
        username: req.admin.username || "admin",
        role: "admin",
      };
    } else if (!targetUser) {
      // If still not found, fallback to first staff user or caller
      targetUser = await User.findOne({ role: "staff", isActive: true });
      if (targetUser) targetUserId = targetUser._id;
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Find assigned template for user or default
    let template = await WorksheetTemplate.findOne({
      assignedUserIds: targetUserId,
      isActive: true,
    });
    if (!template) {
      template = defaultTemplate;
    }

    // Try finding existing worksheet for this user and month
    let worksheet = await DailyWorksheet.findOne({
      user: targetUserId,
      month: month,
    }).populate("template");

    if (!worksheet) {
      // Generate new entries for this month
      const { daysInMonth, monthStartDate, entries } = generateMonthDays(month);

      worksheet = await DailyWorksheet.create({
        user: targetUserId,
        staffName: targetUser.name || targetUser.username || "Staff",
        staffRole: template.designation || "Operations & Customer Relations Executive",
        template: template._id,
        month: month,
        monthStartDate: monthStartDate,
        daysInMonth: daysInMonth,
        entries: entries,
        summary: {},
      });

      worksheet = await DailyWorksheet.findById(worksheet._id).populate("template");
    } else {
      // Always sync with user's assigned template if changed or designation updated
      if (template && (!worksheet.template || String(worksheet.template._id) !== String(template._id))) {
        worksheet.template = template._id;
        worksheet.staffRole = template.designation || worksheet.staffRole;
        worksheet = await DailyWorksheet.findById(worksheet._id).populate("template");
      }
      if (template && template.designation && worksheet.staffRole !== template.designation) {
        worksheet.staffRole = template.designation;
      }
    }

    // Compute updated summary stats
    const templateFields = (worksheet.template && worksheet.template.fields) || template.fields || [];
    worksheet.summary = computeWorksheetSummary(worksheet, templateFields);
    await worksheet.save();

    res.json({
      success: true,
      worksheet,
      template: worksheet.template || template,
      targetUser: {
        _id: targetUser._id,
        name: targetUser.name || targetUser.username,
        role: targetUser.role,
        email: targetUser.email,
      },
    });
  } catch (err) {
    console.error("Error in GET /worksheets/monthly:", err);
    res.status(500).json({ success: false, message: "Failed to get monthly worksheet", error: err.message });
  }
});

// PUT /api/worksheets/entry - Update a single day's entry
router.put("/entry", authMiddleware, async (req, res) => {
  try {
    const { worksheetId, dayNumber, status, values } = req.body;

    if (!worksheetId || !dayNumber) {
      return res.status(400).json({ success: false, message: "worksheetId and dayNumber are required" });
    }

    const worksheet = await DailyWorksheet.findById(worksheetId).populate("template");
    if (!worksheet) {
      return res.status(404).json({ success: false, message: "Worksheet not found" });
    }

    const entry = worksheet.entries.find((e) => e.dayNumber === parseInt(dayNumber, 10));
    if (!entry) {
      return res.status(404).json({ success: false, message: `Day ${dayNumber} not found in worksheet` });
    }

    if (typeof status !== "undefined") entry.status = status;
    if (values && typeof values === "object") {
      entry.values = { ...(entry.values || {}), ...values };
    }

    // Check if this entry is considered filled
    const hasValues = entry.values && Object.values(entry.values).some((v) => v !== "" && v !== null && v !== undefined);
    const hasStatus = !!entry.status && entry.status !== "Weekly Off";
    entry.isFilled = hasValues || hasStatus;
    if (entry.isFilled && !entry.filledAt) {
      entry.filledAt = new Date();
    }
    entry.updatedAt = new Date();
    worksheet.lastFilledAt = new Date();

    const templateFields = (worksheet.template && worksheet.template.fields) || [];
    worksheet.summary = computeWorksheetSummary(worksheet, templateFields);
    await worksheet.save();

    res.json({ success: true, worksheet, updatedEntry: entry });
  } catch (err) {
    console.error("Error updating entry:", err);
    res.status(500).json({ success: false, message: "Failed to update entry", error: err.message });
  }
});

// PUT /api/worksheets/batch - Save whole worksheet changes in one go
router.put("/batch", authMiddleware, async (req, res) => {
  try {
    const { worksheetId, entries } = req.body;

    if (!worksheetId || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: "worksheetId and entries array are required" });
    }

    const worksheet = await DailyWorksheet.findById(worksheetId).populate("template");
    if (!worksheet) {
      return res.status(404).json({ success: false, message: "Worksheet not found" });
    }

    // Update each day entry
    entries.forEach((incoming) => {
      const existing = worksheet.entries.find((e) => e.dayNumber === incoming.dayNumber);
      if (existing) {
        if (typeof incoming.status !== "undefined") existing.status = incoming.status;
        if (incoming.values) {
          existing.values = incoming.values;
        }
        const hasValues = existing.values && Object.values(existing.values).some((v) => v !== "" && v !== null && v !== undefined);
        const hasStatus = !!existing.status && existing.status !== "Weekly Off";
        existing.isFilled = hasValues || hasStatus;
        if (existing.isFilled && !existing.filledAt) {
          existing.filledAt = new Date();
        }
        existing.updatedAt = new Date();
      }
    });

    worksheet.lastFilledAt = new Date();
    const templateFields = (worksheet.template && worksheet.template.fields) || [];
    worksheet.summary = computeWorksheetSummary(worksheet, templateFields);
    await worksheet.save();

    res.json({ success: true, worksheet });
  } catch (err) {
    console.error("Error batch updating worksheet:", err);
    res.status(500).json({ success: false, message: "Failed to batch update worksheet", error: err.message });
  }
});

// POST /api/worksheets/quick-fill - Quick fill today's work modal
router.post("/quick-fill", authMiddleware, async (req, res) => {
  try {
    const { userId, date, status, values } = req.body;
    const targetUserId = userId || (req.admin ? req.admin._id : req.user?._id);

    const targetDate = date ? new Date(date) : new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dayNumber = targetDate.getDate();
    const yearMonth = `${year}-${month}`;

    const defaultTemplate = await getOrCreateDefaultTemplate();

    let targetUser = await User.findById(targetUserId);
    if (!targetUser && req.admin) {
      targetUser = { _id: req.admin._id, name: req.admin.username, username: req.admin.username, role: "admin" };
    }

    let worksheet = await DailyWorksheet.findOne({
      user: targetUserId,
      month: yearMonth,
    }).populate("template");

    if (!worksheet) {
      const { daysInMonth, monthStartDate, entries } = generateMonthDays(yearMonth);
      worksheet = await DailyWorksheet.create({
        user: targetUserId,
        staffName: targetUser?.name || targetUser?.username || "Staff",
        template: defaultTemplate._id,
        month: yearMonth,
        monthStartDate,
        daysInMonth,
        entries,
      });
      worksheet = await DailyWorksheet.findById(worksheet._id).populate("template");
    }

    const entry = worksheet.entries.find((e) => e.dayNumber === dayNumber);
    if (entry) {
      if (status) entry.status = status;
      if (values) entry.values = { ...(entry.values || {}), ...values };
      entry.isFilled = true;
      entry.filledAt = new Date();
      entry.updatedAt = new Date();
    }

    worksheet.lastFilledAt = new Date();
    const templateFields = (worksheet.template && worksheet.template.fields) || [];
    worksheet.summary = computeWorksheetSummary(worksheet, templateFields);
    await worksheet.save();

    res.json({ success: true, message: "Today's work log saved successfully", worksheet });
  } catch (err) {
    console.error("Error in quick-fill:", err);
    res.status(500).json({ success: false, message: "Failed to submit work log", error: err.message });
  }
});

// -------------------------------------------------------------
// EXCEL EXPORT ROUTE
// -------------------------------------------------------------
router.get("/export-excel", authMiddleware, async (req, res) => {
  try {
    const { worksheetId, userId, month } = req.query;

    let worksheet;
    if (worksheetId) {
      worksheet = await DailyWorksheet.findById(worksheetId).populate("template");
    } else {
      worksheet = await DailyWorksheet.findOne({
        user: userId || (req.admin ? req.admin._id : req.user?._id),
        month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      }).populate("template");
    }

    if (!worksheet) {
      return res.status(404).json({ success: false, message: "Worksheet not found to export" });
    }

    const template = worksheet.template || (await getOrCreateDefaultTemplate());
    const fields = template.fields || DEFAULT_FIELDS;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Engineers Parcel Admin";
    workbook.created = new Date();

    // ─────────────────────────────────────────────────────────────
    // SHEET 1: How to Fill Guidelines
    // ─────────────────────────────────────────────────────────────
    const wsHow = workbook.addWorksheet("How to Fill", { views: [{ showGridLines: true }] });
    wsHow.mergeCells(1, 1, 1, 4);
    const rHowTitle = wsHow.getCell(1, 1);
    rHowTitle.value = `DAILY WORK LOG - HOW TO FILL GUIDELINES (${template.companyName || "Engineers Parcel"})`;
    rHowTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    rHowTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D233A" } };
    rHowTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    wsHow.getRow(1).height = 28;

    const rules = [
      ["Rule 1: Daily Fill", "Fill ONCE at day end before leaving the office (6:00 PM - 8:00 PM)."],
      ["Rule 2: Yellow Cells", "YELLOW cells = you fill. Grey & white cells are automated."],
      ["Rule 3: Numbers Only", "Enter numbers only in metric columns. Enter 0 if nothing happened. Leave blank only if on leave."],
      ["Rule 4: Leave Marking", "If on leave or weekly off, set status accordingly and leave metric columns empty."],
      ["Rule 5: Problem Log", "1 concise line stating the biggest operational/client bottleneck faced today."],
    ];

    wsHow.getRow(3).values = ["GUIDELINE", "INSTRUCTION"];
    wsHow.getRow(3).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    wsHow.getRow(3).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A45" } };
    wsHow.getRow(3).getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A45" } };
    wsHow.getRow(3).height = 22;

    let rIdx = 4;
    rules.forEach(([title, desc]) => {
      const row = wsHow.getRow(rIdx);
      row.values = [title, desc];
      row.height = 20;
      row.getCell(1).font = { name: "Arial", size: 9.5, bold: true };
      row.getCell(2).font = { name: "Arial", size: 9.5 };
      rIdx++;
    });

    rIdx += 2;
    wsHow.getRow(rIdx).values = ["COLUMN NAME", "DATA TYPE", "SUMMARY TYPE", "HOW TO FILL"];
    wsHow.getRow(rIdx).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    for (let c = 1; c <= 4; c++) {
      wsHow.getRow(rIdx).getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A45" } };
    }
    wsHow.getRow(rIdx).height = 22;
    rIdx++;

    fields.forEach((f) => {
      const row = wsHow.getRow(rIdx);
      row.values = [f.label, f.type, f.summaryType, f.placeholder || "Enter daily metric"];
      row.height = 20;
      row.getCell(1).font = { name: "Arial", size: 9.5, bold: true };
      row.getCell(2).font = { name: "Arial", size: 9 };
      row.getCell(3).font = { name: "Arial", size: 9 };
      row.getCell(4).font = { name: "Arial", size: 9.5 };
      rIdx++;
    });

    wsHow.getColumn(1).width = 30;
    wsHow.getColumn(2).width = 14;
    wsHow.getColumn(3).width = 16;
    wsHow.getColumn(4).width = 50;

    // ─────────────────────────────────────────────────────────────
    // SHEET 2: Daily Log
    // ─────────────────────────────────────────────────────────────
    const monthShortName = (worksheet.monthStartDate || worksheet.month || "").includes("Oct")
      ? "OCT"
      : (worksheet.monthStartDate || worksheet.month || "").includes("Nov")
      ? "NOV"
      : worksheet.month;
    const sheetName = `Daily Log (${monthShortName})`;
    const ws = workbook.addWorksheet(sheetName.substring(0, 31), {
      views: [{ showGridLines: true }],
    });

    const totalCols = 3 + fields.length + 1; // Date, Day, Status + custom fields + Filled?

    // Row 1: Main Header Banner (Dark Navy)
    const staffTitle = `${(template.title || "DAILY WORK LOG").toUpperCase()} - ${(
      worksheet.staffName || "STAFF"
    ).toUpperCase()}  |  ${template.designation || "Operations & Customer Relations Executive"}  |  ${
      template.companyName || "Engineers Parcel"
    }`;

    ws.mergeCells(1, 1, 1, totalCols);
    const r1 = ws.getCell(1, 1);
    r1.value = staffTitle;
    r1.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D233A" }, // Dark Navy Blue
    };
    r1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 28;

    // Row 2: Sub-banner with Month Start Date & Instructions
    ws.getCell(2, 1).value = "Month start date:";
    ws.getCell(2, 1).font = { name: "Arial", size: 10, bold: true };
    ws.getCell(2, 2).value = worksheet.monthStartDate || `01-${worksheet.month}`;
    ws.getCell(2, 2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0D233A" } };
    ws.getCell(2, 2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF99" }, // Soft Yellow
    };

    ws.mergeCells(2, 4, 2, totalCols);
    const r2Instr = ws.getCell(2, 4);
    r2Instr.value =
      template.instructions ||
      "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.";
    r2Instr.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF333333" } };
    r2Instr.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(2).height = 22;

    // Row 3: Blank separator
    ws.getRow(3).height = 8;

    // Row 4: Column Headers
    const headers = ["Date", "Day", "Status", ...fields.map((f) => f.label), "Filled?"];
    const headerRow = ws.getRow(4);
    headerRow.values = headers;
    headerRow.height = 36;

    for (let c = 1; c <= totalCols; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF102A45" }, // Navy Header
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF0D233A" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    }

    // Row 5: Example row (matching exact Google Sheet screenshot)
    const exampleFieldValues = {
      totalOrders: 14,
      quotationsPrepared: 8,
      invoicesSent: 6,
      invoiceValue: 42000,
      receivingInvoice: 5,
      paymentsReceived: 18000,
      paymentFollowup: 8,
      pendingDues: 96000,
      pettyCash: 4700,
      biggestProblem: "Customer not picking call at Hirapur",
    };

    const exampleVals = [
      "EXAMPLE ->",
      "Tue",
      "Present",
      ...fields.map((f) =>
        exampleFieldValues[f.key] !== undefined
          ? exampleFieldValues[f.key]
          : f.type === "number"
          ? 5
          : "Notes..."
      ),
      "Yes",
    ];
    const exampleRow = ws.getRow(5);
    exampleRow.values = exampleVals;
    exampleRow.height = 20;
    for (let c = 1; c <= totalCols; c++) {
      const cell = exampleRow.getCell(c);
      cell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F4F8" },
      };
      cell.alignment = { vertical: "middle", horizontal: c <= 3 ? "center" : "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    }

    // Rows 6+: Daily Entries
    let currentRowIdx = 6;
    worksheet.entries.forEach((entry) => {
      const rowVals = [
        entry.displayDate || entry.date,
        entry.dayOfWeek,
        entry.status || "",
        ...fields.map((f) => (entry.values && entry.values[f.key] !== undefined ? entry.values[f.key] : "")),
        entry.isFilled ? "Yes" : "",
      ];

      const row = ws.getRow(currentRowIdx);
      row.values = rowVals;
      row.height = 22;

      const isSunday = entry.dayOfWeek === "Sun";

      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 9.5 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (c <= 2) {
          // Date & Day
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isSunday ? "FFF8FAFC" : "FFFFFFFF" },
          };
          if (isSunday) cell.font = { name: "Arial", size: 9.5, color: { argb: "FF94A3B8" } };
        } else if (c === 3) {
          // Status column
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isSunday ? "FFF8FAFC" : "FFFFFFFF" },
          };
          if (entry.status === "Present") {
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF15803D" } };
          } else if (entry.status === "Leave") {
            cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
          }
        } else if (c === totalCols) {
          // Filled?
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.font = { name: "Arial", size: 9.5, color: { argb: entry.isFilled ? "FF16A34A" : "FF94A3B8" } };
        } else {
          // User-input cells: LIGHT YELLOW (#FFFDE7) as instructed in Google Sheet!
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isSunday ? "FFFBFDE6" : "FFFFFCEB" }, // Signature yellow from screenshot
          };
        }
      }

      currentRowIdx++;
    });

    // Summary Totals Row at the bottom
    const totalRow = ws.getRow(currentRowIdx);
    const summaryVals = ["TOTALS", "", `Present: ${worksheet.summary?.daysPresent || 0}`];
    fields.forEach((f) => {
      if (f.summaryType === "sum" || f.summaryType === "average") {
        summaryVals.push(worksheet.summary?.fieldTotals?.[f.key] || 0);
      } else {
        summaryVals.push("");
      }
    });
    summaryVals.push(`Filled: ${worksheet.summary?.filledDaysCount || 0}`);
    totalRow.values = summaryVals;
    totalRow.height = 24;

    for (let c = 1; c <= totalCols; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0D233A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0D233A" } },
        bottom: { style: "medium", color: { argb: "FF0D233A" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    }

    // Set Column Widths
    ws.getColumn(1).width = 12; // Date
    ws.getColumn(2).width = 8;  // Day
    ws.getColumn(3).width = 14; // Status
    fields.forEach((f, idx) => {
      const colIdx = 4 + idx;
      ws.getColumn(colIdx).width = Math.max(16, Math.min(32, f.label.length + 3));
    });
    ws.getColumn(totalCols).width = 10; // Filled?

    // ─────────────────────────────────────────────────────────────
    // SHEET 3: Weekly Summary
    // ─────────────────────────────────────────────────────────────
    const wsWeekly = workbook.addWorksheet("Weekly Summary", { views: [{ showGridLines: true }] });
    const numCols = 3 + fields.length;
    wsWeekly.mergeCells(1, 1, 1, numCols);
    const rWeeklyTitle = wsWeekly.getCell(1, 1);
    rWeeklyTitle.value = `WEEKLY WORK SUMMARY - ${(worksheet.staffName || "STAFF").toUpperCase()}  |  ${worksheet.month}`;
    rWeeklyTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    rWeeklyTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D233A" } };
    rWeeklyTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    wsWeekly.getRow(1).height = 28;

    const weeklyHeaders = ["Week Period", "Working Days", "Days Present", ...fields.map((f) => f.label)];
    const wHeaderRow = wsWeekly.getRow(3);
    wHeaderRow.values = weeklyHeaders;
    wHeaderRow.height = 28;

    for (let c = 1; c <= weeklyHeaders.length; c++) {
      const cell = wHeaderRow.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A45" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF0D233A" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    }

    // Define 5 weeks
    const weeksDef = [
      { name: "Week 1 (01 - 07)", start: 1, end: 7 },
      { name: "Week 2 (08 - 14)", start: 8, end: 14 },
      { name: "Week 3 (15 - 21)", start: 15, end: 21 },
      { name: "Week 4 (22 - 28)", start: 22, end: 28 },
      { name: `Week 5 (29 - ${worksheet.daysInMonth || 31})`, start: 29, end: worksheet.daysInMonth || 31 },
    ];

    let wRowIdx = 4;
    const grandTotals = { present: 0, fieldSums: {} };
    fields.forEach((f) => { grandTotals.fieldSums[f.key] = 0; });

    weeksDef.forEach((w) => {
      const weekEntries = worksheet.entries.filter((e) => e.dayNumber >= w.start && e.dayNumber <= w.end);
      const workingDays = weekEntries.filter((e) => e.dayOfWeek !== "Sun").length;
      const presentCount = weekEntries.filter((e) => e.status === "Present").length;
      grandTotals.present += presentCount;

      const weekVals = [w.name, workingDays, presentCount];
      fields.forEach((f) => {
        if (f.summaryType === "sum" || f.summaryType === "average") {
          let sum = 0;
          let count = 0;
          weekEntries.forEach((e) => {
            const val = parseFloat(e.values?.[f.key]);
            if (!isNaN(val)) {
              sum += val;
              count++;
            }
          });
          const result = f.summaryType === "average" && count > 0 ? parseFloat((sum / count).toFixed(1)) : sum;
          weekVals.push(result);
          grandTotals.fieldSums[f.key] += sum;
        } else {
          // Collect problem notes or leave blank
          const notes = weekEntries
            .map((e) => e.values?.[f.key])
            .filter((v) => v && String(v).trim().length > 0)
            .join("; ");
          weekVals.push(notes || "—");
        }
      });

      const row = wsWeekly.getRow(wRowIdx);
      row.values = weekVals;
      row.height = 24;
      for (let c = 1; c <= weeklyHeaders.length; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 9.5 };
        cell.alignment = { vertical: "middle", horizontal: c <= 3 ? "center" : "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      }
      wRowIdx++;
    });

    // Grand Totals Row for Weekly Summary
    const wTotalRow = wsWeekly.getRow(wRowIdx);
    const wTotalVals = ["MONTH TOTAL", worksheet.entries.filter((e) => e.dayOfWeek !== "Sun").length, grandTotals.present];
    fields.forEach((f) => {
      if (f.summaryType === "sum" || f.summaryType === "average") {
        wTotalVals.push(grandTotals.fieldSums[f.key] || 0);
      } else {
        wTotalVals.push("—");
      }
    });
    wTotalRow.values = wTotalVals;
    wTotalRow.height = 26;
    for (let c = 1; c <= weeklyHeaders.length; c++) {
      const cell = wTotalRow.getCell(c);
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0D233A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0D233A" } },
        bottom: { style: "medium", color: { argb: "FF0D233A" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    }

    wsWeekly.getColumn(1).width = 22;
    wsWeekly.getColumn(2).width = 14;
    wsWeekly.getColumn(3).width = 14;
    fields.forEach((f, idx) => {
      wsWeekly.getColumn(4 + idx).width = Math.max(16, Math.min(35, f.label.length + 3));
    });

    const safeName = (worksheet.staffName || "Staff").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `EP_Daily_Sheet_${safeName}_${worksheet.month}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating Excel export:", err);
    res.status(500).json({ success: false, message: "Failed to generate Excel export", error: err.message });
  }
});

module.exports = router;
