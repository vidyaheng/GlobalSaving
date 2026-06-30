// app.js
// Main controller for Global Saving Calculator
// ต้องโหลดหลัง plans.js, calc.js, log.js, export-pdf.js, export-excel.js

(function () {
  "use strict";

  // =============================
  // Basic settings
  // =============================

  // เปลี่ยน PIN ตรงนี้
  // หมายเหตุ: PIN แบบนี้เป็น soft lock เท่านั้น ไม่ใช่ security จริง
  const APP_PINS = new Set([
    "104669",
    "114252",
    "114460",
    "126462",
    "126641",
    "126666",
    "130079",
    "132987",
    "094373",
    "071253",
    "102288"
  ]);

  const AUTH_KEY = "global_saving_auth";
  const LAST_PLAN_KEY = "global_saving_last_plan";

  let currentQuote = null;
  let isSyncingPremiumFields = false;

  // =============================
  // DOM helpers
  // =============================

  function $(id) {
    return document.getElementById(id);
  }

  function show(el) {
    if (el) el.hidden = false;
  }

  function hide(el) {
    if (el) el.hidden = true;
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value ?? "-";
  }

  function getInputValue(id) {
    const el = $(id);
    return el ? el.value : "";
  }

  function setInputValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
  }

  function money(value) {
    if (window.GSCalc && typeof GSCalc.formatMoney === "function") {
      return `${GSCalc.formatMoney(value)} บาท`;
    }

    const n = Number(value) || 0;
    return `${n.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} บาท`;
  }

  function percent(value) {
    if (window.GSCalc && typeof GSCalc.formatPercent === "function") {
      return GSCalc.formatPercent(value);
    }

    const n = Number(value) || 0;
    return `${(n * 100).toFixed(2)}%`;
  }

  function formatInputNumber(value) {
  const n = Number(value) || 0;
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;

  return String(rounded);
}

  function getSelectedPlan() {
    const planId = getInputValue("plan-id");
  
    if (!planId || typeof getPlan !== "function") return null;
  
    return getPlan(planId);
  }
  
  function getMinimumSumAssured(plan) {
    return Number(plan?.minSumAssured) || 20000;
  }

  function tableMoney(value) {
    const n = Number(value) || 0;
  
    return n.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  function tableCell(value, className = "") {
    const n = Number(value) || 0;
    const classes = [className, n === 0 ? "zero-cell" : ""]
      .filter(Boolean)
      .join(" ");
  
    return `<td${classes ? ` class="${classes}"` : ""}>${tableMoney(n)}</td>`;
  }
  
  function calculateTaxSaving(row, quote) {
    const taxRate = Number(quote?.summary?.taxRate) || 0;
    const premium = Number(row.premiumAfterDiscount) || 0;
  
    return Math.round(((premium * taxRate) / 100 + Number.EPSILON) * 100) / 100;
  }

  function thaiGender(value) {
    if (value === "female") return "หญิง";
    if (value === "male") return "ชาย";
    return value || "-";
  }

  function todayText() {
    return new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function writeLog(action, payload = {}) {
    if (window.GSLog && typeof GSLog.write === "function") {
      GSLog.write(action, payload);
      return;
    }

    // fallback ชั่วคราว ก่อนทำ log.js
    console.info("[GS LOG]", action, payload);
  }

  // =============================
  // Auth
  // =============================

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function setAuthenticated(value) {
    if (value) {
      sessionStorage.setItem(AUTH_KEY, "1");
    } else {
      sessionStorage.removeItem(AUTH_KEY);
    }
  }

  function renderAuthState() {
    const loginScreen = $("login-screen");
    const appShell = $("app-shell");

    if (isAuthenticated()) {
      hide(loginScreen);
      show(appShell);
    } else {
      show(loginScreen);
      hide(appShell);
    }
  }

  function handlePinSubmit(event) {
    event.preventDefault();

    const input = $("pin-input");
    const error = $("pin-error");
    const pin = input ? input.value.trim() : "";

    if (APP_PINS.has(pin)) {
      setAuthenticated(true);
      hide(error);
      if (input) input.value = "";

      writeLog("login", {
        at: new Date().toISOString()
      });

      renderAuthState();
      return;
    }

    show(error);
    writeLog("login_failed", {
      at: new Date().toISOString()
    });
  }

  function handleLogout() {
    writeLog("logout", {
      at: new Date().toISOString()
    });

    setAuthenticated(false);
    currentQuote = null;
    renderAuthState();
  }

  // =============================
  // Plan setup
  // =============================

  function populatePlanSelect() {
    const select = $("plan-id");
    if (!select) return;

    if (typeof getPlanList !== "function") return;

    const plans = getPlanList();

    select.innerHTML = plans
      .map((plan) => {
        return `<option value="${plan.id}">${plan.displayName || plan.planName}</option>`;
      })
      .join("");

    const lastPlan = localStorage.getItem(LAST_PLAN_KEY);
    if (lastPlan && plans.some((p) => p.id === lastPlan)) {
      select.value = lastPlan;
    }
  }

  function applyPlanDefaults() {
    const planId = getInputValue("plan-id");

    if (typeof getPlan !== "function") return;

    const plan = getPlan(planId);
    if (!plan) return;

    localStorage.setItem(LAST_PLAN_KEY, planId);

    if (plan.defaultInput) {
      if (plan.defaultInput.gender) {
        setInputValue("gender", plan.defaultInput.gender);
      }

      if (plan.defaultInput.age) {
        setInputValue("age", plan.defaultInput.age);
      }

      if (plan.defaultInput.sumAssured) {
        setInputValue("sum-assured", plan.defaultInput.sumAssured);
      }

      if (plan.defaultInput.assumedIndexReturn != null) {
        setInputValue("assumed-index-return", plan.defaultInput.assumedIndexReturn);
      }

      if (plan.defaultInput.taxRate != null) {
        setInputValue("tax-rate", plan.defaultInput.taxRate);
      }
    }

    updateAutoPremium();
  }

  function updateAutoPremium() {
    if (isSyncingPremiumFields) return;
  
    const plan = getSelectedPlan();
    const rawValue = getInputValue("sum-assured");
    const sumAssured = Number(rawValue) || 0;
  
    if (!plan || !window.GSCalc) return;
  
    // สำคัญ: ระหว่างกำลังพิมพ์ ถ้าว่างหรือเป็น 0 ยังไม่ต้องเด้งกลับเป็น 20,000
    if (!rawValue || sumAssured <= 0) {
      setInputValue("annual-premium", "");
      return;
    }
  
    isSyncingPremiumFields = true;
  
    const premiumBeforeDiscount = GSCalc.calculateBaseAnnualPremium(
      plan,
      sumAssured
    );
  
    setInputValue("annual-premium", formatInputNumber(premiumBeforeDiscount));
  
    if (typeof GSCalc.calculatePremiumDiscount === "function") {
      const discount = GSCalc.calculatePremiumDiscount(
        sumAssured,
        premiumBeforeDiscount
      );
  
      setText("summary-sum-assured", money(sumAssured));
      setText(
        "summary-discount",
        `${percent(discount.discountRate)} / ${money(discount.discountAmount)}`
      );
      setText("summary-premium-after", money(discount.premiumAfterDiscount));
    }
  
    isSyncingPremiumFields = false;
  }

  function updateSumAssuredFromPremium() {
    if (isSyncingPremiumFields) return;
  
    const plan = getSelectedPlan();
    const rawValue = getInputValue("annual-premium");
    const premiumBeforeDiscount = Number(rawValue) || 0;
  
    if (!plan || !window.GSCalc) return;
  
    // สำคัญ: ระหว่างกำลังพิมพ์ ถ้าว่างหรือเป็น 0 ยังไม่ต้องเด้งกลับ
    if (!rawValue || premiumBeforeDiscount <= 0) {
      setInputValue("sum-assured", "");
      return;
    }
  
    const rate =
      plan.basePremiumRate == null
        ? 1
        : Number(plan.basePremiumRate) || 1;
  
    const sumAssured = premiumBeforeDiscount / rate;
  
    isSyncingPremiumFields = true;
  
    setInputValue("sum-assured", formatInputNumber(sumAssured));
  
    if (typeof GSCalc.calculatePremiumDiscount === "function") {
      const discount = GSCalc.calculatePremiumDiscount(
        sumAssured,
        premiumBeforeDiscount
      );
  
      setText("summary-sum-assured", money(sumAssured));
      setText(
        "summary-discount",
        `${percent(discount.discountRate)} / ${money(discount.discountAmount)}`
      );
      setText("summary-premium-after", money(discount.premiumAfterDiscount));
    }
  
    isSyncingPremiumFields = false;
  }

  function enforceMinimumSumAssured() {
    const plan = getSelectedPlan();
    const input = $("sum-assured");
  
    if (!plan || !input) return;
  
    const minSumAssured = getMinimumSumAssured(plan);
    const currentValue = Number(input.value) || 0;
  
    if (currentValue > 0 && currentValue < minSumAssured) {
      input.value = String(minSumAssured);
      updateAutoPremium();
    }
  }

  function enforceMinimumPremium() {
    const plan = getSelectedPlan();
    const input = $("annual-premium");
  
    if (!plan || !input || !window.GSCalc) return;
  
    const premium = Number(input.value) || 0;
    if (premium <= 0) return;
  
    const minSumAssured = getMinimumSumAssured(plan);
    const minPremium = GSCalc.calculateBaseAnnualPremium(plan, minSumAssured);
  
    if (premium < minPremium) {
      isSyncingPremiumFields = true;
  
      setInputValue("sum-assured", formatInputNumber(minSumAssured));
      setInputValue("annual-premium", formatInputNumber(minPremium));
  
      isSyncingPremiumFields = false;
  
      updateAutoPremium();
      return;
    }
  
    updateSumAssuredFromPremium();
  }
  
  function activateTab(tabName) {
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      const isActive = panel.dataset.tabPanel === tabName;
      panel.hidden = !isActive;
      panel.classList.toggle("active", isActive);
    });
  
    document.querySelectorAll("[data-tab]").forEach((button) => {
      const isActive = button.dataset.tab === tabName;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }
  
  function setTabEnabled(tabName, enabled) {
    const button = document.querySelector(`[data-tab="${tabName}"]`);
    if (button) {
      button.disabled = !enabled;
    }
  }
  
  function bindTabEvents() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        activateTab(button.dataset.tab);
      });
    });
  }

  // =============================
  // Form
  // =============================

  function collectFormInput() {
    return {
      planId: getInputValue("plan-id"),
      gender: getInputValue("gender"),
      age: getInputValue("age"),
      sumAssured: getInputValue("sum-assured"),
      annualPremium: getInputValue("annual-premium"),
      assumedIndexReturn: getInputValue("assumed-index-return"),
      taxRate: getInputValue("tax-rate"),

      customerName: getInputValue("customer-name").trim(),
      advisorName: getInputValue("advisor-name").trim()
    };
  }

  function showFormErrors(errors) {
    const box = $("form-errors");
    if (!box) return;

    if (!errors || errors.length === 0) {
      box.innerHTML = "";
      hide(box);
      return;
    }

    box.innerHTML = errors.map((err) => `<div>• ${err}</div>`).join("");
    show(box);
  }

  function handleQuoteSubmit(event) {
    event.preventDefault();

    if (!window.GSCalc || typeof GSCalc.calculateQuote !== "function") {
      showFormErrors(["ไม่พบ calc.js หรือ GSCalc.calculateQuote()"]);
      return;
    }

    const input = collectFormInput();
    const quote = GSCalc.calculateQuote(input);

    if (!quote.ok) {
      currentQuote = null;
      showFormErrors(quote.errors);
      hide($("result-section"));
      return;
    }

    quote.meta = {
      customerName: input.customerName || "-",
      advisorName: input.advisorName || "-",
      createdAt: new Date().toISOString(),
      createdDateText: todayText()
    };

    currentQuote = quote;

    showFormErrors([]);
    renderQuote(quote);
    
    setTabEnabled("table", true);
    show($("result-section"));
    activateTab("table");
    
    writeLog("calculate_quote", {
      planId: quote.summary.planId,
      sumAssured: quote.summary.sumAssured,
      annualPremiumAfterDiscount: quote.summary.annualPremiumAfterDiscount,
      at: new Date().toISOString()
    });
  }

  // =============================
  // Render quote
  // =============================

  function renderQuote(quote) {
    renderLiveSummary(quote);
    renderReport(quote);
    renderYearlyTable(quote);
  }

  function renderLiveSummary(quote) {
    const s = quote.summary;

    setText("summary-plan", s.displayName || s.planName || "-");
    setText("summary-sum-assured", money(s.sumAssured));
    setText("summary-discount", `${percent(s.discountRate)} / ${money(s.annualDiscountAmount)}`);
    setText("summary-premium-after", money(s.annualPremiumAfterDiscount));
    setText("summary-total-premium", money(s.totalPremiumAfterDiscount));
    setText("summary-total-benefit", money(s.projectedTotalBenefit));
  }

  function renderReport(quote) {
    const s = quote.summary;
    const meta = quote.meta || {};

    setText("report-title", s.displayName || s.planName || "Global Saving");
    setText(
      "report-subtitle",
      `ทุนประกัน ${money(s.sumAssured)} | ชำระเบี้ย ${s.premiumPayYears} ปี | คุ้มครอง ${s.coverageYears} ปี`
    );

    setText("report-date", meta.createdDateText || todayText());
    setText("report-advisor", meta.advisorName || "-");
    setText("report-customer", meta.customerName || "-");

    setText("report-plan", s.displayName || s.planName || "-");
    setText("report-code", s.code || "-");
    setText("report-gender-age", `${thaiGender(s.gender)} / ${s.age} ปี`);
    setText("report-sum-assured", money(s.sumAssured));
    setText("report-coverage-years", `${s.coverageYears} ปี`);
    setText("report-pay-years", `${s.premiumPayYears} ปี`);

    setText("report-premium-before", money(s.annualPremiumBeforeDiscount));
    setText("report-discount-rate", percent(s.discountRate));
    setText("report-discount-amount", money(s.annualDiscountAmount));
    setText("report-premium-after", money(s.annualPremiumAfterDiscount));
    setText("report-total-before", money(s.totalPremiumBeforeDiscount));
    setText("report-total-after", money(s.totalPremiumAfterDiscount));
    setText("report-discount-label", s.discountLabel || "-");

    setText("report-total-cashback", money(s.totalCashback));
    setText("report-index-benefit", money(s.totalProjectedIndexBenefit));
    setText("report-maturity-benefit", money(s.guaranteedMaturityBenefit));
    setText("report-total-benefit", money(s.projectedTotalBenefit));
  }

  function renderYearlyTable(quote) {
    const tbody = $("yearly-table-body");
    if (!tbody) return;
  
    tbody.innerHTML = "";
  
    quote.yearlyTable.forEach((row) => {
      const tr = document.createElement("tr");
  
      const taxSaving = calculateTaxSaving(row, quote);
  
      tr.innerHTML = `
        <td>${row.policyYear}</td>
        <td>${row.age}</td>
  
        ${tableCell(row.premiumAfterDiscount)}
        ${tableCell(taxSaving, "col-tax")}
  
        ${tableCell(row.livingBenefit)}
        ${tableCell(row.projectedIndexBenefit)}
        ${tableCell(row.accumulatedLivingBenefit, "col-cashback-cum")}
  
        ${tableCell(row.surrenderIndexBenefit, "col-surrender-detail")}
        ${tableCell(row.surrenderGuaranteed, "col-surrender-detail")}
        ${tableCell(row.surrenderTotal, "total-cell")}
        
        ${tableCell(row.deathIndexBenefit, "col-death-detail")}
        ${tableCell(row.deathGuaranteed, "col-death-detail")}
        ${tableCell(row.deathTotal, "total-cell")}
      `;
  
      tbody.appendChild(tr);
    });
  }

  function setupBenefitTableToggles() {
    const table = $("yearly-table");
    if (!table) return;
  
    document.querySelectorAll("[data-toggle-column]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.toggleColumn;
  
        if (target === "tax") {
          const shown = table.classList.toggle("show-tax");
          button.textContent = shown ? "−" : "+";
        }
  
        if (target === "cashback") {
          const shown = table.classList.toggle("show-cashback");
          button.textContent = shown ? "−" : "+";
        }
      });
    });
  
    document.querySelectorAll("[data-toggle-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.toggleGroup;
  
        if (target === "surrender") {
          const collapsed = table.classList.toggle("collapse-surrender");
          button.textContent = collapsed ? "+" : "−";
  
          const th = $("th-surrender-group");
          if (th) th.colSpan = collapsed ? 1 : 3;
        }
  
        if (target === "death") {
          const collapsed = table.classList.toggle("collapse-death");
          button.textContent = collapsed ? "+" : "−";
  
          const th = $("th-death-group");
          if (th) th.colSpan = collapsed ? 1 : 3;
        }
      });
    });
  }

  // =============================
  // Clear / reset
  // =============================

  function clearForm() {
    const form = $("quote-form");
    if (form) form.reset();

    applyPlanDefaults();

    currentQuote = null;

    showFormErrors([]);

    hide($("result-section"));

    setTabEnabled("table", false);
    setTabEnabled("chart", false);
    activateTab("input");

    setText("summary-plan", "-");
    setText("summary-sum-assured", "-");
    setText("summary-discount", "-");
    setText("summary-premium-after", "-");
    setText("summary-total-premium", "-");
    setText("summary-total-benefit", "-");

    const tbody = $("yearly-table-body");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" class="empty-table">
            กรุณากดคำนวณเพื่อแสดงตาราง
          </td>
        </tr>
      `;
    }

    writeLog("clear_form", {
      at: new Date().toISOString()
    });
  }

  // =============================
  // Export
  // =============================

  function handleExportPdf() {
    if (!currentQuote) {
      alert("กรุณากดคำนวณก่อน Export PDF");
      return;
    }

    writeLog("export_pdf", {
      planId: currentQuote.summary.planId,
      sumAssured: currentQuote.summary.sumAssured,
      at: new Date().toISOString()
    });

    if (window.GSExportPDF && typeof GSExportPDF.exportQuote === "function") {
      GSExportPDF.exportQuote(currentQuote);
      return;
    }

    // fallback ก่อนทำ export-pdf.js
    window.print();
  }

  function handleExportExcel() {
    if (!currentQuote) {
      alert("กรุณากดคำนวณก่อน Export Excel");
      return;
    }

    writeLog("export_excel", {
      planId: currentQuote.summary.planId,
      sumAssured: currentQuote.summary.sumAssured,
      at: new Date().toISOString()
    });

    if (window.GSExportExcel && typeof GSExportExcel.exportQuote === "function") {
      GSExportExcel.exportQuote(currentQuote);
      return;
    }

    alert("ยังไม่ได้สร้าง export-excel.js");
  }

  // =============================
  // Keyboard / UX helpers
  // =============================

  function addAutoFormatNumber(inputId) {
    const input = $(inputId);
    if (!input) return;

    input.addEventListener("blur", () => {
      const value = Number(String(input.value).replace(/,/g, ""));

      if (!Number.isFinite(value) || value <= 0) return;

      // input type number ไม่รองรับ comma จึงเก็บเป็นตัวเลขปกติ
      input.value = String(Math.round(value));
    });
  }

  

  // =============================
  // Init
  // =============================

  function bindEvents() {
    $("pin-form")?.addEventListener("submit", handlePinSubmit);
    $("btn-logout")?.addEventListener("click", handleLogout);
  
    $("quote-form")?.addEventListener("submit", handleQuoteSubmit);
  
    $("btn-clear")?.addEventListener("click", clearForm);
  
    $("btn-export-pdf")?.addEventListener("click", handleExportPdf);
    $("btn-export-excel")?.addEventListener("click", handleExportExcel);
  
    $("sum-assured")?.addEventListener("input", updateAutoPremium);
    $("sum-assured")?.addEventListener("blur", enforceMinimumSumAssured);
    
    $("annual-premium")?.addEventListener("input", updateSumAssuredFromPremium);
    $("annual-premium")?.addEventListener("blur", enforceMinimumPremium);
    
    $("plan-id")?.addEventListener("change", applyPlanDefaults);
  
    // addAutoFormatNumber("sum-assured"); ปิดการแสดงค่าเป็นจำนวนเต็มไว้ก่อน ต้องการแสดงเป็น ทศนิยม

    setupBenefitTableToggles();
  
    bindTabEvents();
  }

  function init() {
    populatePlanSelect();
    applyPlanDefaults();
    bindEvents();
    renderAuthState();

    activateTab("input");
    setTabEnabled("table", false);
    setTabEnabled("chart", false);

    writeLog("app_loaded", {
      at: new Date().toISOString()
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
