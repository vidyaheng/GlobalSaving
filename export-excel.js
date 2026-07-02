// export-excel.js
// Excel export for Global Saving Calculator
// Version: Benefit Table only
// ใช้ SheetJS / xlsx-js-style: XLSX global object ต้องถูกโหลดก่อน export-excel.js

(function () {
  "use strict";

  function safeText(value, fallback = "-") {
    return value == null || value === "" ? fallback : String(value);
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function pickNumber(source, keys, fallback = "") {
    for (const key of keys) {
      if (source && source[key] != null && source[key] !== "") {
        const n = Number(source[key]);
        if (Number.isFinite(n)) return n;
      }
    }
    return fallback;
  }

  function safeFileName(text) {
    return String(text || "global-saving-benefit-table")
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

    return `${safeFileName(`${plan}-${customer}-${sumAssured}-benefit-table`)}.xlsx`;
  }

  function formatPercentText(value) {
    if (value == null || value === "") return "-";

    const n = Number(value);
    if (!Number.isFinite(n)) return safeText(value);

    return `${n.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}%`;
  }

  function getAssumedReturnText(quote) {
    const s = quote.summary || {};
    const input = quote.input || {};
    const plan = quote.plan || {};

    const assumedReturn =
      s.assumedIndexReturn ??
      input.assumedIndexReturn ??
      plan.assumedIndexReturn ??
      "";

    return `ผลตอบแทนคาดหวังจากดัชนี: ${formatPercentText(assumedReturn)} ต่อปี`;
  }

  function makeBenefitTableSheetData(quote) {
    const s = quote.summary || {};
    const table = Array.isArray(quote.yearlyTable) ? quote.yearlyTable : [];

    const title = "ตารางผลประโยชน์รายปี";
    const subtitle = getAssumedReturnText(quote);
    const planLine = `${safeText(s.displayName || s.planName, "-")} ${
      s.code ? `(${s.code})` : ""
    }`.trim();

    const header = [
      "ปี",
      "อายุ",
      "เบี้ยประกัน",
      "เงินคืน",
      "ผลตอบแทน\nดัชนี",
      "กรณีเวนคืน\nผลประโยชน์รวม",
      "กรณีเสียชีวิต\nผลประโยชน์รวม"
    ];

    const rows = table.map((row) => [
      row.policyYear,
      row.age,

      pickNumber(
        row,
        ["premiumAfterDiscount", "premium", "annualPremiumAfterDiscount"],
        0
      ),

      pickNumber(
        row,
        ["annualCashback", "cashback", "cashReturn"],
        0
      ),

      pickNumber(
        row,
        ["projectedIndexBenefit", "indexBenefit", "annualIndexBenefit"],
        0
      ),

      pickNumber(
        row,
        [
          "totalBenefitThisYear",
          "surrenderBenefitTotal",
          "surrenderValue",
          "totalSurrenderBenefit",
          "totalBenefitIfSurrender"
        ],
        0
      ),

      pickNumber(
        row,
        [
          "deathBenefitTotal",
          "totalDeathBenefit",
          "totalDeathBenefitThisYear",
          "deathBenefitThisYear",
          "deathBenefit",
          "projectedDeathBenefit",
          "totalBenefitIfDeath",
          "totalBenefitOnDeath"
        ],
        ""
      )
    ]);

    return [
      [title, "", "", "", "", "", ""],
      [subtitle, "", "", "", "", "", ""],
      [planLine, "", "", "", "", "", ""],
      header,
      ...rows
    ];
  }

  function setColumnWidths(worksheet, widths) {
    worksheet["!cols"] = widths.map((wch) => ({ wch }));
  }

  function setRowHeights(worksheet, rowHeights) {
    worksheet["!rows"] = rowHeights.map((hpt) => ({ hpt }));
  }

  function cellAddress(rowIndex, colIndex) {
    return XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  }

  function ensureCell(worksheet, address) {
    if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
    return worksheet[address];
  }

  function applyStyle(worksheet, address, style) {
    const cell = ensureCell(worksheet, address);
    cell.s = Object.assign({}, cell.s || {}, style);
  }

  function applyNumberFormat(worksheet, startRow, endRow, columns, numberFormat) {
    for (let r = startRow; r <= endRow; r++) {
      columns.forEach((c) => {
        const address = cellAddress(r, c);
        const cell = worksheet[address];

        if (cell && typeof cell.v === "number") {
          cell.z = numberFormat;
        }
      });
    }
  }

  function applyBenefitTableStyle(worksheet, dataRowCount) {
    const lastRow = 3 + dataRowCount;
    const lastCol = 6;

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }
    ];

    worksheet["!autofilter"] = {
      ref: `A4:G${lastRow + 1}`
    };

    const thinBorder = {
      top: { style: "thin", color: { rgb: "D8E0EA" } },
      bottom: { style: "thin", color: { rgb: "D8E0EA" } },
      left: { style: "thin", color: { rgb: "D8E0EA" } },
      right: { style: "thin", color: { rgb: "D8E0EA" } }
    };

    const baseCellStyle = {
      font: {
        name: "Arial",
        sz: 11,
        color: { rgb: "111827" }
      },
      alignment: {
        vertical: "center",
        horizontal: "right"
      },
      border: thinBorder
    };

    const headerStyle = {
      font: {
        name: "Arial",
        sz: 11,
        bold: true,
        color: { rgb: "111827" }
      },
      fill: {
        fgColor: { rgb: "F3F4F6" }
      },
      alignment: {
        vertical: "center",
        horizontal: "center",
        wrapText: true
      },
      border: thinBorder
    };

    for (let r = 3; r <= lastRow; r++) {
      for (let c = 0; c <= lastCol; c++) {
        applyStyle(
          worksheet,
          cellAddress(r, c),
          r === 3 ? headerStyle : baseCellStyle
        );
      }
    }

    // จัดกึ่งกลางคอลัมน์ ปี / อายุ
    for (let r = 4; r <= lastRow; r++) {
      [0, 1].forEach((c) => {
        applyStyle(worksheet, cellAddress(r, c), {
          alignment: {
            vertical: "center",
            horizontal: "center"
          }
        });
      });
    }

    // เน้นคอลัมน์ผลประโยชน์รวมแบบ PDF
    for (let r = 4; r <= lastRow; r++) {
      [5, 6].forEach((c) => {
        applyStyle(worksheet, cellAddress(r, c), {
          font: {
            name: "Arial",
            sz: 11,
            bold: true,
            color: { rgb: "0B4D94" }
          }
        });
      });
    }

    // Title
    applyStyle(worksheet, "A1", {
      font: {
        name: "Arial",
        sz: 18,
        bold: true,
        color: { rgb: "0F172A" }
      },
      alignment: {
        vertical: "center",
        horizontal: "left"
      }
    });

    // Assumed return line
    applyStyle(worksheet, "A2", {
      font: {
        name: "Arial",
        sz: 11,
        bold: true,
        color: { rgb: "0B4D94" }
      },
      alignment: {
        vertical: "center",
        horizontal: "left"
      }
    });

    // Plan line
    applyStyle(worksheet, "A3", {
      font: {
        name: "Arial",
        sz: 10,
        color: { rgb: "64748B" }
      },
      alignment: {
        vertical: "center",
        horizontal: "left"
      }
    });

    applyNumberFormat(worksheet, 4, lastRow, [2, 3, 4, 5, 6], "#,##0.00");
  }

  function createBenefitTableWorksheet(quote) {
    const data = makeBenefitTableSheetData(quote);
    const ws = XLSX.utils.aoa_to_sheet(data);

    setColumnWidths(ws, [8, 8, 16, 16, 20, 22, 22]);
    setRowHeights(ws, [28, 22, 20, 42]);

    applyBenefitTableStyle(ws, data.length - 4);

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
    const benefitWs = createBenefitTableWorksheet(quote);

    XLSX.utils.book_append_sheet(wb, benefitWs, "Benefit Table");
    XLSX.writeFile(wb, buildFileName(quote));
  }

  window.GSExportExcel = {
    exportQuote
  };
})();
