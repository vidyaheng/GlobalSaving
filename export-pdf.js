// export-pdf.js
// PDF export for Global Saving Calculator
// ใช้วิธี window.print() เพื่อให้ browser จัดการภาษาไทยและ layout ได้ดีที่สุด

(function () {
  "use strict";

  function safeText(value, fallback = "-") {
    return value == null || value === "" ? fallback : String(value);
  }

  function safeFileName(text) {
    return String(text || "global-saving-quotation")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  function buildPdfTitle(quote) {
    if (!quote || !quote.summary) {
      return "global-saving-quotation";
    }

    const s = quote.summary;
    const meta = quote.meta || {};

    const plan = safeText(s.displayName || s.planName, "Global-Saving");
    const customer = meta.customerName && meta.customerName !== "-"
      ? meta.customerName
      : "customer";

    const sumAssured = Number(s.sumAssured || 0).toLocaleString("th-TH");

    return safeFileName(`${plan}-${customer}-${sumAssured}`);
  }

  function preparePrintView(quote) {
    const resultSection = document.getElementById("result-section");

    if (resultSection) {
      resultSection.hidden = false;
    }

    const title = buildPdfTitle(quote);
    document.title = title;
  }

  function restoreAfterPrint(originalTitle) {
    document.title = originalTitle || "Global Saving Calculator";
  }

  function exportQuote(quote) {
    if (!quote || !quote.ok) {
      alert("กรุณากดคำนวณก่อน Export PDF");
      return;
    }

    const originalTitle = document.title;

    preparePrintView(quote);

    // หน่วงเล็กน้อยให้ DOM render ครบก่อนเปิด print dialog
    setTimeout(() => {
      window.print();

      // หลัง print dialog ปิด browser ส่วนใหญ่จะกลับมาทำงานต่อ
      setTimeout(() => {
        restoreAfterPrint(originalTitle);
      }, 500);
    }, 120);
  }

  window.GSExportPDF = {
    exportQuote
  };
})();
