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
  const PIN_ADVISOR_NAMES = {
    "104669": "พิชญา",
    "114252": "วิทยา",
    "114460": "รณิดา",
    "126462": "วรรณนิภา",
    "126641": "กษมา",
    "126666": "ภรินทร์ธร",
    "130079": "การดา",
    "132987": "อนุชิต",
    "094373": "โมเม",
    "071253": "",
    "102288": "",
    "141545": "ศรัญญา"
  };
  
  const APP_PINS = new Set(Object.keys(PIN_ADVISOR_NAMES));

  const AUTH_KEY = "global_saving_auth";
  const LAST_PLAN_KEY = "global_saving_last_plan";

  const ADVISOR_NAME_KEY = "global_saving_advisor_name";

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

  function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
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

  function irrText(value) {
    const n = Number(value);
  
    if (!Number.isFinite(n)) {
      return "-";
    }
  
    return `${(n * 100).toFixed(2)}% ต่อปี`;
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

  function getBasePremiumRate(plan) {
    return plan?.basePremiumRate == null
      ? 1
      : Number(plan.basePremiumRate) || 1;
  }
  
  function getDiscountTiersForPremiumInput(plan) {
    const minSumAssured = getMinimumSumAssured(plan);
    const maxSumAssured = Number(plan?.maxSumAssured) || Infinity;
  
    return [
      {
        min: minSumAssured,
        max: Math.min(99999.999999, maxSumAssured),
        discountRate: 0
      },
      {
        min: Math.max(100000, minSumAssured),
        max: Math.min(499999.999999, maxSumAssured),
        discountRate: 0.005
      },
      {
        min: Math.max(500000, minSumAssured),
        max: maxSumAssured,
        discountRate: 0.01
      }
    ].filter((tier) => tier.min <= tier.max);
  }
  
  function calculateSumAssuredFromFinalPremium(plan, annualPremiumAfterDiscount) {
    const finalPremium = Number(annualPremiumAfterDiscount) || 0;
    const baseRate = getBasePremiumRate(plan);
  
    if (!finalPremium || finalPremium <= 0) return 0;
  
    const candidates = [];
  
    getDiscountTiersForPremiumInput(plan).forEach((tier) => {
      const divisor = baseRate - tier.discountRate;
      if (divisor <= 0) return;
  
      const sumAssured = finalPremium / divisor;
  
      if (
        sumAssured >= tier.min - 0.01 &&
        sumAssured <= tier.max + 0.01
      ) {
        candidates.push({
          sumAssured,
          discountRate: tier.discountRate
        });
      }
    });
  
    // ถ้ามีหลาย candidate ช่วงรอยต่อส่วนลด ให้เลือกทุนที่สูงกว่า
    // เพราะลูกค้ากรอก "เบี้ยที่อยากจ่ายจริง" แล้วควรได้ทุนสูงสุดที่สอดคล้องกับส่วนลด
    if (candidates.length > 0) {
      return candidates.reduce((best, item) => {
        return item.sumAssured > best.sumAssured ? item : best;
      }).sumAssured;
    }
  
    // fallback สำหรับช่วงกำลังพิมพ์หรือค่าที่ต่ำมาก
    return finalPremium / baseRate;
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
    if (quote?.summary?.taxMode !== "include") {
      return 0;
    }
  
    return Number(row.taxSaving) || 0;
  }

  function thaiGender(value) {
    if (value === "female") return "หญิง";
    if (value === "male") return "ชาย";
    return value || "-";
  }

  function planTitleEn(summary) {
    if (summary.planId === "GS_15_8") {
      return "Global Saving Plus 15/8 (Index-Linked)";
    }
  
    if (summary.planId === "GS_25_5") {
      return "Global Saving Plus 25/5 (Index-Linked)";
    }
  
    return summary.displayName || summary.planName || "Global Saving Plus";
  }
  
  function planTitleTh(summary) {
    if (summary.planId === "GS_15_8") {
      return "โกลบอล เซฟวิ่งส์ พลัส 15/8 (อินเด็กซ์ ลิงค์)";
    }
  
    if (summary.planId === "GS_25_5") {
      return "โกลบอล เซฟวิ่งส์ พลัส 25/5 (อินเด็กซ์ ลิงค์)";
    }
  
    return "โกลบอล เซฟวิ่งส์ พลัส";
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

  function setAdvisorNameFromPin(pin) {
    const advisorName = PIN_ADVISOR_NAMES[pin] || "";
    sessionStorage.setItem(ADVISOR_NAME_KEY, advisorName);
    return advisorName;
  }
  
  function getAdvisorNameFromSession() {
    return sessionStorage.getItem(ADVISOR_NAME_KEY) || "";
  }
  
  function applyAdvisorNameFromPin(options = {}) {
    const { force = false } = options;
    const input = $("advisor-name");
  
    if (!input) return;
  
    const advisorName = getAdvisorNameFromSession();
  
    if (force || !input.value.trim()) {
      input.value = advisorName;
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
      setAdvisorNameFromPin(pin);
    
      hide(error);
      if (input) input.value = "";
    
      writeLog("login", {
        pin,
        advisorName: getAdvisorNameFromSession(),
        at: new Date().toISOString()
      });
    
      renderAuthState();
      applyAdvisorNameFromPin({ force: true });
    
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
    sessionStorage.removeItem(ADVISOR_NAME_KEY);
  
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
  
      if (plan.defaultInput.assumedIndexReturn != null) {
        setInputValue("assumed-index-return", plan.defaultInput.assumedIndexReturn);
      }

      if (plan.defaultInput.payoutOption) {
        setInputValue("payout-option", plan.defaultInput.payoutOption);
      }
  
      if (plan.defaultInput.taxRate != null) {
        setInputValue("tax-rate", plan.defaultInput.taxRate);
      }
  
      // สำคัญ:
      // ถ้ามี default annualPremium ให้ถือว่าเป็น "เบี้ยหลังส่วนลดที่ลูกค้าจ่ายจริง"
      // แล้วคำนวณทุนย้อนกลับ
      if (plan.defaultInput.annualPremium) {
        setInputValue("annual-premium", plan.defaultInput.annualPremium);
        updateSumAssuredFromPremium();
        return;
      }
  
      // fallback ถ้าไม่มี annualPremium ค่อยใช้ทุนเป็นตัวตั้ง
      if (plan.defaultInput.sumAssured) {
        setInputValue("sum-assured", plan.defaultInput.sumAssured);
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
  
    if (!rawValue || sumAssured <= 0) {
      setInputValue("annual-premium", "");
      return;
    }
  
    const premiumBeforeDiscount = GSCalc.calculateBaseAnnualPremium(
      plan,
      sumAssured
    );
  
    const discount = GSCalc.calculatePremiumDiscount(
      sumAssured,
      premiumBeforeDiscount
    );
  
    isSyncingPremiumFields = true;
  
    // สำคัญ: ช่องเบี้ยต้องแสดง "เบี้ยหลังส่วนลด" ที่ลูกค้าจ่ายจริง
    setInputValue(
      "annual-premium",
      formatInputNumber(discount.premiumAfterDiscount)
    );
  
    setText("summary-sum-assured", money(sumAssured));
    setText(
      "summary-discount",
      `${percent(discount.discountRate)} / ${money(discount.discountAmount)}`
    );
    setText("summary-premium-after", money(discount.premiumAfterDiscount));
  
    isSyncingPremiumFields = false;
  }

  function updateSumAssuredFromPremium() {
    if (isSyncingPremiumFields) return;
  
    const plan = getSelectedPlan();
    const rawValue = getInputValue("annual-premium");
    const annualPremiumAfterDiscount = Number(rawValue) || 0;
  
    if (!plan || !window.GSCalc) return;
  
    if (!rawValue || annualPremiumAfterDiscount <= 0) {
      setInputValue("sum-assured", "");
      return;
    }
  
    const sumAssured = calculateSumAssuredFromFinalPremium(
      plan,
      annualPremiumAfterDiscount
    );
  
    const premiumBeforeDiscount = GSCalc.calculateBaseAnnualPremium(
      plan,
      sumAssured
    );
  
    const discount = GSCalc.calculatePremiumDiscount(
      sumAssured,
      premiumBeforeDiscount
    );
  
    isSyncingPremiumFields = true;
  
    setInputValue("sum-assured", formatInputNumber(sumAssured));
  
    setText("summary-sum-assured", money(sumAssured));
    setText(
      "summary-discount",
      `${percent(discount.discountRate)} / ${money(discount.discountAmount)}`
    );
    setText("summary-premium-after", money(discount.premiumAfterDiscount));
  
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
  
    const annualPremiumAfterDiscount = Number(input.value) || 0;
    if (annualPremiumAfterDiscount <= 0) return;
  
    const minSumAssured = getMinimumSumAssured(plan);
  
    const minPremiumBeforeDiscount = GSCalc.calculateBaseAnnualPremium(
      plan,
      minSumAssured
    );
  
    const minDiscount = GSCalc.calculatePremiumDiscount(
      minSumAssured,
      minPremiumBeforeDiscount
    );
  
    const minPremiumAfterDiscount = minDiscount.premiumAfterDiscount;
  
    if (annualPremiumAfterDiscount < minPremiumAfterDiscount) {
      isSyncingPremiumFields = true;
  
      setInputValue("sum-assured", formatInputNumber(minSumAssured));
      setInputValue(
        "annual-premium",
        formatInputNumber(minPremiumAfterDiscount)
      );
  
      isSyncingPremiumFields = false;
  
      updateAutoPremium();
      return;
    }
  
    const sumAssured = calculateSumAssuredFromFinalPremium(
      plan,
      annualPremiumAfterDiscount
    );
  
    const premiumBeforeDiscount = GSCalc.calculateBaseAnnualPremium(
      plan,
      sumAssured
    );
  
    const discount = GSCalc.calculatePremiumDiscount(
      sumAssured,
      premiumBeforeDiscount
    );
  
    isSyncingPremiumFields = true;
  
    setInputValue("sum-assured", formatInputNumber(sumAssured));
    setInputValue(
      "annual-premium",
      formatInputNumber(discount.premiumAfterDiscount)
    );
  
    isSyncingPremiumFields = false;
  
    updateAutoPremium();
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

  function isTaxIncluded() {
    return getRadioValue("taxMode") === "include";
  }
  
  function syncTaxFieldsVisibility() {
    const box = $("tax-extra-fields");
  
    if (!box) return;
  
    if (isTaxIncluded()) {
      show(box);
    } else {
      hide(box);
    }
  }
  
  function renderTaxDisplayState(quote) {
    const taxIncluded = quote?.summary?.taxMode === "include";
    const table = $("yearly-table");
    const taxButton = document.querySelector('[data-toggle-column="tax"]');
  
    if (table) {
      table.classList.toggle("show-tax", taxIncluded);
    }
  
    if (taxButton) {
      taxButton.hidden = !taxIncluded;
      taxButton.textContent = table?.classList.contains("show-tax")
        ? "ซ่อน ▾"
        : "ลดหย่อน ▸";
    }
  
    setText(
      "report-total-benefit-label",
      taxIncluded ? "ผลรวมหลังภาษี" : "ผลประโยชน์รวม"
    );
  
    setText(
      "report-irr-label",
      taxIncluded ? "IRR หลังภาษี" : "IRR เมื่อครบสัญญา"
    );
  }

  // =============================
  // Form
  // =============================

  function collectFormInput() {
    const taxMode = getRadioValue("taxMode") === "include" ? "include" : "none";
  
    return {
      planId: getInputValue("plan-id"),
      gender: getInputValue("gender"),
      age: getInputValue("age"),
      sumAssured: getInputValue("sum-assured"),
      annualPremium: getInputValue("annual-premium"),
      assumedIndexReturn: getInputValue("assumed-index-return"),
      payoutOption: getInputValue("payout-option"),
  
      taxMode,
      taxRate: taxMode === "include" ? getInputValue("tax-rate") : 0,
      usedTaxAllowance:
        taxMode === "include" ? getInputValue("used-tax-allowance") : 0,
  
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
      customerName: input.customerName || "คุณ ลูกค้า คนสำคัญ",
      advisorName: input.advisorName || "-",
      createdAt: new Date().toISOString(),
      createdDateText: todayText()
    };

    currentQuote = quote;

    showFormErrors([]);

    setTabEnabled("table", true);
    setTabEnabled("chart", true);
    
    show($("result-section"));
    activateTab("table");
    
    renderQuote(quote);
    
    writeLog("calculate_quote", {
      planId: quote.summary.planId,
      sumAssured: quote.summary.sumAssured,
      annualPremiumAfterDiscount: quote.summary.annualPremiumAfterDiscount,
      at: new Date().toISOString()
    });
  }

  function compactChartMoney(value) {
    const n = Number(value) || 0;
  
    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(1)}ล.`;
    }
  
    if (n >= 100000) {
      return `${(n / 100000).toFixed(1)}แสน`;
    }
  
    if (n >= 1000) {
      return `${Math.round(n / 1000)}k`;
    }
  
    return String(Math.round(n));
  }
  
  function renderBenefitChart(quote) {
    const container = $("benefit-chart");
    if (!container || !quote?.yearlyTable?.length) return;
  
    const rows = quote.yearlyTable;
  
    const width = 900;
    const height = 380;
  
    const margin = {
      top: 28,
      right: 34,
      bottom: 46,
      left: 76
    };
  
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
  
    const allValues = rows.flatMap((row) => [
      Number(row.cumulativePremiumAfterDiscount) || 0,
      Number(row.surrenderTotal) || 0,
      Number(row.deathTotal) || 0
    ]);
  
    const maxValue = Math.max(...allValues, 1);
    const paddedMax = maxValue * 1.08;
  
    const x = (index) => {
      if (rows.length === 1) return margin.left;
      return margin.left + (index / (rows.length - 1)) * chartWidth;
    };
  
    const y = (value) => {
      return margin.top + chartHeight - ((Number(value) || 0) / paddedMax) * chartHeight;
    };
  
    const makePoints = (key) => {
      return rows
        .map((row, index) => `${x(index).toFixed(2)},${y(row[key]).toFixed(2)}`)
        .join(" ");
    };
  
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = paddedMax * ratio;
      const yy = y(value);
  
      return `
        <line
          class="chart-grid-line"
          x1="${margin.left}"
          y1="${yy}"
          x2="${width - margin.right}"
          y2="${yy}"
        ></line>
        <text
          class="chart-y-label"
          x="${margin.left - 12}"
          y="${yy + 4}"
          text-anchor="end"
        >
          ${compactChartMoney(value)}
        </text>
      `;
    }).join("");
  
    const labelStep = Math.ceil(rows.length / 8);
  
    const xLabels = rows
      .map((row, index) => {
        if (index !== 0 && index !== rows.length - 1 && index % labelStep !== 0) {
          return "";
        }
  
        return `
          <text
            class="chart-x-label"
            x="${x(index)}"
            y="${height - 16}"
            text-anchor="middle"
          >
            ปี ${row.policyYear}
          </text>
        `;
      })
      .join("");
  
    container.innerHTML = `
      <svg
        class="benefit-svg"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="กราฟเปรียบเทียบเบี้ยสะสม เวนคืนรวม และเสียชีวิตรวม"
      >
        <rect class="chart-bg" x="0" y="0" width="${width}" height="${height}"></rect>
  
        ${yTicks}
  
        <line
          class="chart-axis"
          x1="${margin.left}"
          y1="${margin.top}"
          x2="${margin.left}"
          y2="${height - margin.bottom}"
        ></line>
  
        <line
          class="chart-axis"
          x1="${margin.left}"
          y1="${height - margin.bottom}"
          x2="${width - margin.right}"
          y2="${height - margin.bottom}"
        ></line>
  
        <polyline
          class="chart-line premium"
          points="${makePoints("cumulativePremiumAfterDiscount")}"
        ></polyline>
  
        <polyline
          class="chart-line surrender"
          points="${makePoints("surrenderTotal")}"
        ></polyline>
  
        <polyline
          class="chart-line death"
          points="${makePoints("deathTotal")}"
        ></polyline>
  
        ${xLabels}
      </svg>
    `;
  }

  // =============================
  // Render quote
  // =============================

  function renderQuote(quote) {
    renderLiveSummary(quote);
    renderReport(quote);
    renderPayoutOptionLabels(quote);
    renderTaxDisplayState(quote);
    renderYearlyTable(quote);
    renderBenefitChart(quote);
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

    setText("report-title", planTitleEn(s));
    setText("report-title-th", planTitleTh(s));
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
    setText("report-total-benefit", money(s.projectedTotalBenefit));
    setText("report-irr", irrText(s.irrAtMaturity));
  }

  function renderPayoutOptionLabels(quote) {
    const isAccumulate = quote?.summary?.payoutOption === "accumulate";
  
    const cashbackLabel = isAccumulate
      ? "เงินคืนสะสม 0.5%"
      : "เงินคืนรับแล้ว";
  
    const indexLabel = isAccumulate
      ? "ดัชนีสะสม 0.5%"
      : "ดัชนีรับแล้ว";
  
    const cashbackEl = $("th-cashback-carry-label");
    const indexEl = $("th-index-carry-label");
  
    if (cashbackEl) {
      cashbackEl.innerHTML = cashbackLabel.replace(" ", "<br />");
    }
  
    if (indexEl) {
      indexEl.innerHTML = indexLabel.replace(" ", "<br />");
    }
  }

  function renderYearlyTable(quote) {
    const tbody = $("yearly-table-body");
    if (!tbody) return;
  
    tbody.innerHTML = "";
  
    quote.yearlyTable.forEach((row) => {
      const tr = document.createElement("tr");
  
      const taxSaving = calculateTaxSaving(row, quote);
  
      // ถ้า calc.js ใหม่มี carriedCashbackValue / carriedIndexValue ให้ใช้ตัวนั้น
      // ถ้ายังไม่มี ให้ fallback เป็นค่าเดิม เพื่อกันตารางพัง
      const cashbackCarryValue =
        row.carriedCashbackValue ?? row.accumulatedLivingBenefit ?? 0;
  
      const indexCarryValue =
        row.carriedIndexValue ?? row.cumulativeReceivedLivingIndexBenefit ?? 0;
  
      tr.innerHTML = `
        <td>${row.policyYear}</td>
        <td>${row.age}</td>
  
        ${tableCell(row.premiumAfterDiscount)}
        ${tableCell(taxSaving, "col-tax")}
  
        ${tableCell(row.livingBenefit)}
        ${tableCell(cashbackCarryValue, "col-cashback-cum")}
        ${tableCell(row.projectedIndexBenefit)}
        ${tableCell(indexCarryValue, "col-index-cum")}
  
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

        if (target === "index-cum") {
          const shown = table.classList.toggle("show-index-cum");
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

    applyAdvisorNameFromPin({ force: true });

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
          <td colspan="14" class="empty-table">
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
  
    $("payout-option")?.addEventListener("change", () => {
      if (currentQuote) {
        $("quote-form")?.requestSubmit();
      }
    });
  
    document.querySelectorAll('input[name="taxMode"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        syncTaxFieldsVisibility();
  
        if (currentQuote) {
          $("quote-form")?.requestSubmit();
        }
      });
    });
  
    $("tax-rate")?.addEventListener("change", () => {
      if (currentQuote) {
        $("quote-form")?.requestSubmit();
      }
    });
  
    $("used-tax-allowance")?.addEventListener("input", () => {
      if (currentQuote) {
        $("quote-form")?.requestSubmit();
      }
    });
  
    // addAutoFormatNumber("sum-assured"); ปิดการแสดงค่าเป็นจำนวนเต็มไว้ก่อน ต้องการแสดงเป็น ทศนิยม
  
    setupBenefitTableToggles();
  
    bindTabEvents();
  }

  function init() {
    populatePlanSelect();
    applyPlanDefaults();
    syncTaxFieldsVisibility();
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
