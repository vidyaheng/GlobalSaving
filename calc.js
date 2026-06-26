// calc.js
// Core calculation engine for Global Saving quotation
// ต้องโหลด plans.js ก่อน calc.js เสมอ

(function () {
  "use strict";

  // -----------------------------
  // Basic helpers
  // -----------------------------

  function toNumber(value, fallback = 0) {
    const n = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  function roundMoney(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(value) {
    return roundMoney(value).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatPercent(value) {
    return `${roundMoney(value * 100).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }

  function getSafePlan(planId) {
    if (typeof getPlan !== "function") {
      throw new Error("ไม่พบ getPlan() กรุณาโหลด plans.js ก่อน calc.js");
    }

    const plan = getPlan(planId);

    if (!plan) {
      throw new Error(`ไม่พบข้อมูลแผน: ${planId}`);
    }

    return plan;
  }

  // -----------------------------
  // Base premium logic
  // -----------------------------
  
  function calculateBaseAnnualPremium(plan, sumAssured) {
    const amount = toNumber(sumAssured);
    const rate =
      plan.basePremiumRate == null
        ? 1
        : toNumber(plan.basePremiumRate, 1);
  
    return roundMoney(amount * rate);
  }

  // -----------------------------
  // Default product assumptions
  // -----------------------------
  // หมายเหตุ:
  // ตัวเลขบางส่วนเป็น default จากโครงเอกสารตัวอย่าง
  // ต่อไปสามารถย้ายไปเก็บใน plans.js ได้

  function getDefaultPlanAssumptions(planId) {
    const assumptions = {
      GS_15_8: {
        annualCashbackRate: 0.01,

        // ผลประโยชน์ครบกำหนดสัญญาโดยประมาณจากตัวอย่าง 801% ของทุน
        guaranteedMaturityRate: 8.01,

        // อัตราการจ่ายผลตอบแทนตามดัชนี
        indexPayoutRates: {
          10: 0.30,
          15: 0.70
        },

        indexParticipationRate: 0.90
      },

      GS_25_5: {
        annualCashbackRate: 0.01,

        // ผลประโยชน์ครบกำหนดสัญญาโดยประมาณจากตัวอย่าง 501% ของทุน
        guaranteedMaturityRate: 5.01,

        // อัตราการจ่ายผลตอบแทนตามดัชนี
        indexPayoutRates: {
          10: 0.05,
          15: 0.10,
          20: 0.15,
          25: 0.70
        },

        indexParticipationRate: 0.90
      }
    };

    return assumptions[planId] || {
      annualCashbackRate: 0,
      guaranteedMaturityRate: 0,
      indexPayoutRates: {},
      indexParticipationRate: 0.90
    };
  }

  // -----------------------------
  // Discount logic
  // -----------------------------

  function calculatePremiumDiscount(sumAssured, annualPremiumBeforeDiscount) {
    const amount = toNumber(sumAssured);
    const premium = toNumber(annualPremiumBeforeDiscount);

    let discountRate = 0;
    let discountLabel = "ไม่มีส่วนลดเบี้ย";

    if (typeof getPremiumDiscountRate === "function") {
      discountRate = getPremiumDiscountRate(amount);
    } else {
      if (amount >= 500000) discountRate = 0.01;
      else if (amount >= 100000) discountRate = 0.005;
    }

    if (typeof getPremiumDiscountLabel === "function") {
      discountLabel = getPremiumDiscountLabel(amount);
    } else {
      if (discountRate === 0.01) {
        discountLabel = "ทุนประกัน 500,000 บาทขึ้นไป ลดเบี้ย 1%";
      } else if (discountRate === 0.005) {
        discountLabel = "ทุนประกัน 100,000–499,999 บาท ลดเบี้ย 0.5%";
      }
    }

    const discountAmount = roundMoney(premium * discountRate);
    const premiumAfterDiscount = roundMoney(premium - discountAmount);

    return {
      discountRate,
      discountLabel,
      discountAmount,
      premiumBeforeDiscount: roundMoney(premium),
      premiumAfterDiscount
    };
  }

  // -----------------------------
  // Validation
  // -----------------------------

  function validateQuoteInput(input) {
    const errors = [];

    const planId = input.planId;
    const plan = getSafePlan(planId);

    const age = toNumber(input.age);
    const sumAssured = toNumber(input.sumAssured);
    const annualPremium = toNumber(input.annualPremium);

    if (!planId) {
      errors.push("กรุณาเลือกแผน");
    }

    if (!age || age <= 0) {
      errors.push("กรุณาระบุอายุให้ถูกต้อง");
    }

    if (!sumAssured || sumAssured <= 0) {
      errors.push("กรุณาระบุทุนประกันให้ถูกต้อง");
    }

    if (plan.minSumAssured && sumAssured < plan.minSumAssured) {
      errors.push(
        `ทุนประกันขั้นต่ำของแผนนี้คือ ${formatMoney(plan.minSumAssured)} บาท`
      );
    }

    if (plan.maxSumAssured && sumAssured > plan.maxSumAssured) {
      errors.push(
        `ทุนประกันสูงสุดของแผนนี้คือ ${formatMoney(plan.maxSumAssured)} บาท`
      );
    }

    if (!annualPremium || annualPremium <= 0) {
      errors.push("กรุณาระบุเบี้ยประกันภัยต่อปีให้ถูกต้อง");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // -----------------------------
  // Index-linked projection
  // -----------------------------
  // assumedIndexReturn = ผลตอบแทนเฉลี่ยต่อปี เช่น -1, 0, 3, 5
  // ใช้สูตร projection:
  // index growth = Max(0, (1 + r)^year - 1)
  // index benefit = cumulative premium after discount × growth × participation × payout rate

  function calculateProjectedIndexBenefit({
    policyYear,
    cumulativePremiumAfterDiscount,
    assumedIndexReturn,
    payoutRate,
    participationRate
  }) {
    const r = toNumber(assumedIndexReturn) / 100;

    if (!payoutRate || payoutRate <= 0) {
      return 0;
    }

    const indexGrowth = Math.max(0, Math.pow(1 + r, policyYear) - 1);

    const benefit =
      cumulativePremiumAfterDiscount *
      indexGrowth *
      participationRate *
      payoutRate;

    return roundMoney(benefit);
  }

  // -----------------------------
  // Yearly table
  // -----------------------------

  function buildYearlyTable({
    plan,
    age,
    sumAssured,
    annualPremiumBeforeDiscount,
    annualPremiumAfterDiscount,
    discountAmountPerYear,
    assumedIndexReturn
  }) {
    const assumptions = getDefaultPlanAssumptions(plan.id);

    const coverageYears = toNumber(plan.coverageYears);
    const premiumPayYears = toNumber(plan.premiumPayYears);

    const annualCashbackRate =
      plan.annualCashbackRate ?? assumptions.annualCashbackRate;

    const guaranteedMaturityRate =
      plan.guaranteedMaturityRate ?? assumptions.guaranteedMaturityRate;

    const indexPayoutRates =
      plan.indexPayoutRates ?? assumptions.indexPayoutRates;

    const indexParticipationRate =
      plan.indexParticipationRate ?? assumptions.indexParticipationRate;

    const rows = [];

    let cumulativePremiumBeforeDiscount = 0;
    let cumulativeDiscount = 0;
    let cumulativePremiumAfterDiscount = 0;
    let cumulativeCashback = 0;
    let cumulativeIndexBenefit = 0;

    for (let year = 1; year <= coverageYears; year++) {
      const isPremiumPayYear = year <= premiumPayYears;
      const isMaturityYear = year === coverageYears;

      const premiumBeforeDiscount = isPremiumPayYear
        ? roundMoney(annualPremiumBeforeDiscount)
        : 0;

      const discountAmount = isPremiumPayYear
        ? roundMoney(discountAmountPerYear)
        : 0;

      const premiumAfterDiscount = isPremiumPayYear
        ? roundMoney(annualPremiumAfterDiscount)
        : 0;

      cumulativePremiumBeforeDiscount = roundMoney(
        cumulativePremiumBeforeDiscount + premiumBeforeDiscount
      );

      cumulativeDiscount = roundMoney(cumulativeDiscount + discountAmount);

      cumulativePremiumAfterDiscount = roundMoney(
        cumulativePremiumAfterDiscount + premiumAfterDiscount
      );

      const annualCashback = roundMoney(sumAssured * annualCashbackRate);
      cumulativeCashback = roundMoney(cumulativeCashback + annualCashback);

      const indexPayoutRate = indexPayoutRates[year] || 0;

      const projectedIndexBenefit = calculateProjectedIndexBenefit({
        policyYear: year,
        cumulativePremiumAfterDiscount,
        assumedIndexReturn,
        payoutRate: indexPayoutRate,
        participationRate: indexParticipationRate
      });

      cumulativeIndexBenefit = roundMoney(
        cumulativeIndexBenefit + projectedIndexBenefit
      );

      const guaranteedMaturityBenefit = isMaturityYear
        ? roundMoney(sumAssured * guaranteedMaturityRate)
        : 0;

      const totalBenefitThisYear = roundMoney(
        annualCashback + projectedIndexBenefit + guaranteedMaturityBenefit
      );

      rows.push({
        policyYear: year,
        age: toNumber(age) + year - 1,

        premiumBeforeDiscount,
        discountAmount,
        premiumAfterDiscount,

        cumulativePremiumBeforeDiscount,
        cumulativeDiscount,
        cumulativePremiumAfterDiscount,

        annualCashback,
        cumulativeCashback,

        indexPayoutRate,
        projectedIndexBenefit,
        cumulativeIndexBenefit,

        guaranteedMaturityBenefit,
        totalBenefitThisYear
      });
    }

    return rows;
  }

  // -----------------------------
  // Main quote calculation
  // -----------------------------

  function calculateQuote(input) {
    const plan = getSafePlan(input.planId);

    const validation = validateQuoteInput(input);
    if (!validation.valid) {
      return {
        ok: false,
        errors: validation.errors
      };
    }

    const age = toNumber(input.age);
    const gender = input.gender || "male";
    const sumAssured = toNumber(input.sumAssured);
    const annualPremiumBeforeDiscount = calculateBaseAnnualPremium(plan, sumAssured);
    const assumedIndexReturn = toNumber(input.assumedIndexReturn, 0);
    const taxRate = toNumber(input.taxRate, 0);

    const discount = calculatePremiumDiscount(
      sumAssured,
      annualPremiumBeforeDiscount
    );

    const coverageYears = toNumber(plan.coverageYears);
    const premiumPayYears = toNumber(plan.premiumPayYears);

    const totalPremiumBeforeDiscount = roundMoney(
      discount.premiumBeforeDiscount * premiumPayYears
    );

    const totalDiscount = roundMoney(discount.discountAmount * premiumPayYears);

    const totalPremiumAfterDiscount = roundMoney(
      discount.premiumAfterDiscount * premiumPayYears
    );

    const yearlyTable = buildYearlyTable({
      plan,
      age,
      sumAssured,
      annualPremiumBeforeDiscount: discount.premiumBeforeDiscount,
      annualPremiumAfterDiscount: discount.premiumAfterDiscount,
      discountAmountPerYear: discount.discountAmount,
      assumedIndexReturn
    });

    const finalRow = yearlyTable[yearlyTable.length - 1];

    const summary = {
      planId: plan.id,
      productName: plan.productName || "Global Saving",
      planName: plan.planName || plan.displayName,
      displayName: plan.displayName,
      code: plan.code,

      gender,
      age,
      sumAssured,

      coverageYears,
      premiumPayYears,
      paymentMode: plan.paymentMode || "รายปี",

      annualPremiumBeforeDiscount: discount.premiumBeforeDiscount,
      discountRate: discount.discountRate,
      discountLabel: discount.discountLabel,
      annualDiscountAmount: discount.discountAmount,
      annualPremiumAfterDiscount: discount.premiumAfterDiscount,

      totalPremiumBeforeDiscount,
      totalDiscount,
      totalPremiumAfterDiscount,

      assumedIndexReturn,
      taxRate,

      totalCashback: finalRow.cumulativeCashback,
      totalProjectedIndexBenefit: finalRow.cumulativeIndexBenefit,
      guaranteedMaturityBenefit: finalRow.guaranteedMaturityBenefit,

      projectedTotalBenefit: roundMoney(
        finalRow.cumulativeCashback +
          finalRow.cumulativeIndexBenefit +
          finalRow.guaranteedMaturityBenefit
      )
    };

    return {
      ok: true,
      input,
      plan,
      summary,
      yearlyTable
    };
  }

  // -----------------------------
  // Export helpers for app.js / PDF / Excel
  // -----------------------------

  function toSummaryRows(quote) {
    if (!quote || !quote.ok) return [];

    const s = quote.summary;

    return [
      ["แผน", s.displayName || s.planName],
      ["รหัสแผน", s.code || "-"],
      ["เพศ", s.gender],
      ["อายุ", s.age],
      ["ทุนประกัน", formatMoney(s.sumAssured)],
      ["ระยะเวลาคุ้มครอง", `${s.coverageYears} ปี`],
      ["ระยะเวลาชำระเบี้ย", `${s.premiumPayYears} ปี`],
      ["งวดชำระเบี้ย", s.paymentMode],
      ["เบี้ยก่อนส่วนลดต่อปี", formatMoney(s.annualPremiumBeforeDiscount)],
      ["ส่วนลด", `${formatPercent(s.discountRate)} (${s.discountLabel})`],
      ["ส่วนลดต่อปี", formatMoney(s.annualDiscountAmount)],
      ["เบี้ยหลังส่วนลดต่อปี", formatMoney(s.annualPremiumAfterDiscount)],
      ["เบี้ยรวมก่อนส่วนลด", formatMoney(s.totalPremiumBeforeDiscount)],
      ["ส่วนลดรวม", formatMoney(s.totalDiscount)],
      ["เบี้ยรวมหลังส่วนลด", formatMoney(s.totalPremiumAfterDiscount)],
      ["ผลตอบแทนดัชนีสมมติเฉลี่ยต่อปี", `${s.assumedIndexReturn}%`],
      ["เงินจ่ายคืนรวม", formatMoney(s.totalCashback)],
      ["ผลตอบแทนดัชนีประมาณการ", formatMoney(s.totalProjectedIndexBenefit)],
      ["ผลประโยชน์ครบกำหนดแบบรับรอง", formatMoney(s.guaranteedMaturityBenefit)],
      ["ผลประโยชน์รวมประมาณการ", formatMoney(s.projectedTotalBenefit)]
    ];
  }

  function toYearlyTableRows(quote) {
    if (!quote || !quote.ok) return [];

    return quote.yearlyTable.map((row) => ({
      "ปีกรมธรรม์": row.policyYear,
      "อายุ": row.age,
      "เบี้ยก่อนส่วนลด": row.premiumBeforeDiscount,
      "ส่วนลด": row.discountAmount,
      "เบี้ยหลังส่วนลด": row.premiumAfterDiscount,
      "เบี้ยสะสมหลังส่วนลด": row.cumulativePremiumAfterDiscount,
      "เงินจ่ายคืนรายปี": row.annualCashback,
      "เงินจ่ายคืนสะสม": row.cumulativeCashback,
      "อัตราจ่ายผลตอบแทนดัชนี": row.indexPayoutRate,
      "ผลตอบแทนดัชนีประมาณการ": row.projectedIndexBenefit,
      "ผลตอบแทนดัชนีสะสม": row.cumulativeIndexBenefit,
      "ผลประโยชน์ครบกำหนด": row.guaranteedMaturityBenefit,
      "ผลประโยชน์รวมปีนี้": row.totalBenefitThisYear
    }));
  }

  // -----------------------------
  // Public API
  // -----------------------------

  window.GSCalc = {
    calculateQuote,
    validateQuoteInput,
    calculatePremiumDiscount,
    buildYearlyTable,
    calculateProjectedIndexBenefit,
    calculateBaseAnnualPremium,

    toSummaryRows,
    toYearlyTableRows,

    formatMoney,
    formatPercent,
    roundMoney,
    toNumber
  };
})();
