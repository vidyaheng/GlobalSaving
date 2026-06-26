// export-excel.js
// Excel export for Global Saving Calculator
// ใช้ SheetJS: XLSX global object ต้องถูกโหลดก่อน export-excel.js

(function () {
  "use strict";

  function safeText(value, fallback = "-") {
    return value == null || value === "" ? fallback : String(value);
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function safeFileName(text) {
    return String(text || "global-saving-quotation")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  function buildFileName(quote) {
    const s = quote.summary || {};
    const meta = quote.meta || {};

    const plan = safeText(s.displayName || s.planName, "global-saving");
    const customer =
      meta.customerName && meta.customerName !== "-"
        ? meta.customerName
        : "customer";

    const sumAssured = safeNumber(s.sumAssured).toLocaleString("th-TH");

    return `${safeFileName(`${plan}-${customer}-${sumAssured}`)}.xlsx`;
  }

  function makeSummarySheetData(quote) {
    const s = quote.summary;
    const meta = quote.meta || {};

    return [
      ["Global Saving Quotation"],
      [],
      ["วันที่จัดทำ", meta.createdDateText || "-"],
      ["ชื่อลูกค้า", meta.customerName || "-"],
      ["ชื่อผู้เสนอ", meta.advisorName || "-"],
      [],
      ["ข้อมูลแผน", ""],
      ["แผน", s.displayName || s.planName || "-"],
      ["รหัสแผน", s.code || "-"],
      ["เพศ", s.gender === "female" ? "หญิง" : "ชาย"],
      ["อายุ", s.age],
      ["ทุนประกันภัย", s.sumAssured],
      ["ระยะเวลาคุ้มครอง", `${s.coverageYears} ปี`],
      ["ระยะเวลาชำระเบี้ย", `${s.premiumPayYears} ปี`],
      ["งวดชำระเบี้ย", s.paymentMode || "รายปี"],
      [],
      ["เบี้ยและส่วนลด", ""],
      ["เบี้ยก่อนส่วนลด / ปี", s.annualPremiumBeforeDiscount],
      ["อัตราส่วนลด", s.discountRate],
      ["ส่วนลด / ปี", s.annualDiscountAmount],
      ["เบี้ยหลังส่วนลด / ปี", s.annualPremiumAfterDiscount],
      ["เบี้ยรวมก่อนส่วนลด", s.totalPremiumBeforeDiscount],
      ["ส่วนลดรวม", s.totalDiscount],
      ["เบี้ยรวมหลังส่วนลด", s.totalPremiumAfterDiscount],
      ["เงื่อนไขส่วนลด", s.discountLabel || "-"],
      [],
      ["ผลประโยชน์ประมาณการ", ""],
      ["ผลตอบแทนดัชนีสมมติเฉลี่ยต่อปี", `${s.assumedIndexReturn}%`],
      ["เงินจ่ายคืนรวม", s.totalCashback],
      ["ผลตอบแทนดัชนีประมาณการ", s.totalProjectedIndexBenefit],
      ["ผลประโยชน์ครบกำหนดแบบรับรอง", s.guaranteedMaturityBenefit],
      ["ผลประโยชน์รวมประมาณการ", s.projectedTotalBenefit],
      [],
      ["หมายเหตุ", "เอกสารนี้เป็นเพียงเครื่องมือช่วยคำนวณและสรุปข้อมูลเบื้องต้น ไม่ใช่เอกสารกรมธรรม์จริง"]
    ];
  }

  function makeYearlySheetData(quote) {
    const header = [
      "ปีกรมธรรม์",
      "อายุ",
      "เบี้ยก่อนส่วนลด",
      "ส่วนลด",
      "เบี้ยหลังส่วนลด",
      "เบี้ยสะสมก่อนส่วนลด",
      "ส่วนลดสะสม",
      "เบี้ยสะสมหลังส่วนลด",
      "เงินจ่ายคืนรายปี",
      "เงินจ่ายคืนสะสม",
      "อัตราจ่ายผลตอบแทนดัชนี",
      "ผลตอบแทนดัชนีประมาณการ",
      "ผลตอบแทนดัชนีสะสม",
      "ผลประโยชน์ครบกำหนด",
      "ผลประโยชน์รวมปีนี้"
    ];

    const rows = quote.yearlyTable.map((row) => [
      row.policyYear,
      row.age,
      row.premiumBeforeDiscount,
      row.discountAmount,
      row.premiumAfterDiscount,
      row.cumulativePremiumBeforeDiscount,
      row.cumulativeDiscount,
      row.cumulativePremiumAfterDiscount,
      row.annualCashback,
      row.cumulativeCashback,
      row.indexPayoutRate,
      row.projectedIndexBenefit,
      row.cumulativeIndexBenefit,
      row.guaranteedMaturityBenefit,
      row.totalBenefitThisYear
    ]);

    return [header, ...rows];
  }

  function makeInputSheetData(quote) {
    const input = quote.input || {};
    const plan = quote.plan || {};

    return [
      ["Input Data"],
      [],
      ["planId", input.planId || ""],
      ["planName", plan.displayName || plan.planName || ""],
      ["gender", input.gender || ""],
      ["age", input.age || ""],
      ["sumAssured", input.sumAssured || ""],
      ["annualPremiumBeforeDiscount", input.annualPremium || ""],
      ["assumedIndexReturn", input.assumedIndexReturn || ""],
      ["taxRate", input.taxRate || ""],
      ["customerName", input.customerName || ""],
      ["advisorName", input.advisorName || ""]
    ];
  }

  function makeLogSheetData() {
    if (!window.GSLog || typeof GSLog.readLogs !== "function") {
      return [
        ["timestamp", "action", "payload"],
        ["", "ไม่พบ GSLog", ""]
      ];
    }

    const logs = GSLog.readLogs();

    return [
      ["timestamp", "action", "payload"],
      ...logs.map((log) => [
        log.timestamp || "",
        log.action || "",
        JSON.stringify(log.payload || {})
      ])
    ];
  }

  function setColumnWidths(worksheet, widths) {
    worksheet["!cols"] = widths.map((wch) => ({ wch }));
  }

  function setMoneyFormat(worksheet, cellRange, columns) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let r = cellRange.startRow; r <= range.e.r; r++) {
      columns.forEach((c) => {
        const address = XLSX.utils.encode_cell({ r, c });
        if (worksheet[address] && typeof worksheet[address].v === "number") {
          worksheet[address].z = "#,##0.00";
        }
      });
    }
  }

  function setPercentFormat(worksheet, cellRange, columns) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let r = cellRange.startRow; r <= range.e.r; r++) {
      columns.forEach((c) => {
        const address = XLSX.utils.encode_cell({ r, c });
        if (worksheet[address] && typeof worksheet[address].v === "number") {
          worksheet[address].z = "0.00%";
        }
      });
    }
  }

  function createWorksheet(data, widths) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    setColumnWidths(ws, widths);
    return ws;
  }

  function exportQuote(quote) {
    if (!quote || !quote.ok) {
      alert("กรุณากดคำนวณก่อน Export Excel");
      return;
    }

    if (!window.XLSX) {
      alert("ไม่พบไลบรารี XLSX กรุณาตรวจสอบ script SheetJS ใน index.html");
      return;
    }

    const wb = XLSX.utils.book_new();

    const summaryWs = createWorksheet(makeSummarySheetData(quote), [34, 34]);
    const yearlyWs = createWorksheet(
      makeYearlySheetData(quote),
      [12, 10, 18, 16, 18, 20, 16, 20, 18, 18, 22, 22, 22, 20, 20]
    );
    const inputWs = createWorksheet(makeInputSheetData(quote), [30, 38]);
    const logWs = createWorksheet(makeLogSheetData(), [28, 22, 80]);

    setMoneyFormat(summaryWs, { startRow: 0 }, [1]);
    setPercentFormat(summaryWs, { startRow: 0 }, [1]);

    setMoneyFormat(yearlyWs, { startRow: 1 }, [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]);
    setPercentFormat(yearlyWs, { startRow: 1 }, [10]);

    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    XLSX.utils.book_append_sheet(wb, yearlyWs, "Yearly Table");
    XLSX.utils.book_append_sheet(wb, inputWs, "Input");
    XLSX.utils.book_append_sheet(wb, logWs, "Local Log");

    XLSX.writeFile(wb, buildFileName(quote));
  }

  window.GSExportExcel = {
    exportQuote
  };
})();
