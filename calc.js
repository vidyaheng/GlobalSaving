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
        guaranteedMaturityRate: 8.01,
  
        // กรณีมีชีวิตอยู่
        indexPayoutRates: {
          10: 0.30,
          15: 0.70
        },
  
        // กรณีเสียชีวิต
        deathIndexPayoutRates: {
          1: 0,
          2: 1.00,
          3: 1.00,
          4: 1.00,
          5: 1.00,
          6: 1.00,
          7: 1.00,
          8: 1.00,
          9: 1.00,
          10: 1.00,
          11: 0.70,
          12: 0.70,
          13: 0.70,
          14: 0.70,
          15: 0.70
        },
  
        // กรณีเวนคืน
        surrenderIndexPayoutRates: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
          7: 0,
          8: 0,
          9: 0.20,
          10: 0.30,
          11: 0.40,
          12: 0.50,
          13: 0.60,
          14: 0.65,
          15: 0.70
        },
  
        indexParticipationRate: 0.90
      },
  
      GS_25_5: {
        annualCashbackRate: 0.01,
        guaranteedMaturityRate: 5.01,
  
        // กรณีมีชีวิตอยู่
        indexPayoutRates: {
          10: 0.05,
          15: 0.10,
          20: 0.15,
          25: 0.70
        },
  
        // กรณีเสียชีวิต
        deathIndexPayoutRates: {
          1: 0,
          2: 1.00,
          3: 1.00,
          4: 1.00,
          5: 1.00,
          6: 1.00,
          7: 1.00,
          8: 1.00,
          9: 1.00,
          10: 1.00,
          11: 0.95,
          12: 0.95,
          13: 0.95,
          14: 0.95,
          15: 0.95,
          16: 0.85,
          17: 0.85,
          18: 0.85,
          19: 0.85,
          20: 0.85,
          21: 0.70,
          22: 0.70,
          23: 0.70,
          24: 0.70,
          25: 0.70
        },
  
        // กรณีเวนคืน
        surrenderIndexPayoutRates: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0.01,
          7: 0.02,
          8: 0.03,
          9: 0.04,
          10: 0.05,
          11: 0.06,
          12: 0.07,
          13: 0.08,
          14: 0.09,
          15: 0.10,
          16: 0.11,
          17: 0.12,
          18: 0.13,
          19: 0.14,
          20: 0.15,
          21: 0.30,
          22: 0.45,
          23: 0.55,
          24: 0.65,
          25: 0.70
        },
  
        indexParticipationRate: 0.90
      }
    };
  
    return assumptions[planId] || {
      annualCashbackRate: 0,
      guaranteedMaturityRate: 0,
      indexPayoutRates: {},
      deathIndexPayoutRates: {},
      surrenderIndexPayoutRates: {},
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
        discountLabel = "ทุนประกัน 500,000 บาทขึ้นไป ลด 1% ของทุนประกัน";
      } else if (discountRate === 0.005) {
        discountLabel = "ทุนประกัน 100,000–499,999 บาท ลด 0.5% ของทุนประกัน";
      }
    }
  
    // สำคัญ: ส่วนลดคิดจากทุนประกัน ไม่ใช่จากเบี้ย
    const discountAmount = roundMoney(amount * discountRate);
    const premiumAfterDiscount = roundMoney(premium - discountAmount);
  
    return {
      discountRate,
      discountLabel,
      discountBase: amount,
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
  
    return {
      valid: errors.length === 0,
      errors
    };
  }

  function getIndexPayoutRate(rateMap, policyYear) {
    if (!rateMap) return 0;
    return toNumber(rateMap[policyYear], 0);
  }
  
  function calculateIndexFormulaAmount({
    policyYear,
    cumulativePremiumAfterDiscount,
    assumedIndexReturn,
    participationRate
  }) {
    const r = toNumber(assumedIndexReturn) / 100;
    const indexGrowth = Math.max(0, Math.pow(1 + r, policyYear) - 1);
  
    const benefit =
      cumulativePremiumAfterDiscount *
      indexGrowth *
      participationRate;
  
    return roundMoney(benefit);
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
    if (!payoutRate || payoutRate <= 0) {
      return 0;
    }
  
    const baseIndexBenefit = calculateIndexFormulaAmount({
      policyYear,
      cumulativePremiumAfterDiscount,
      assumedIndexReturn,
      participationRate
    });
  
    return roundMoney(baseIndexBenefit * payoutRate);
  }

  function getYearlyBenefitRate(plan, policyYear) {
    if (!Array.isArray(plan.yearlyBenefitRates)) return null;
  
    return (
      plan.yearlyBenefitRates.find((row) => {
        return toNumber(row.year) === toNumber(policyYear);
      }) || null
    );
  }
  
  function scaleBenefitFromRate(plan, per1000Value, sumAssured) {
    const base = toNumber(plan.benefitRateBase, 1000) || 1000;
    const amount = toNumber(sumAssured);
    const rate = toNumber(per1000Value);
  
    return roundMoney((rate * amount) / base);
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
    assumedIndexReturn,
    payoutOption = "withdraw",
    taxMode = "none",
    taxRate = 0,
    usedTaxAllowance = 0,
    taxAllowanceCap = 100000
  }) {
    const assumptions = getDefaultPlanAssumptions(plan.id);
  
    const coverageYears = toNumber(plan.coverageYears);
    const premiumPayYears = toNumber(plan.premiumPayYears);
  
    const indexPayoutRates =
      plan.indexPayoutRates ?? assumptions.indexPayoutRates;
  
    const deathIndexPayoutRates =
      plan.deathIndexPayoutRates ?? assumptions.deathIndexPayoutRates;
  
    const surrenderIndexPayoutRates =
      plan.surrenderIndexPayoutRates ?? assumptions.surrenderIndexPayoutRates;
  
    const indexParticipationRate =
      plan.indexParticipationRate ?? assumptions.indexParticipationRate;
  
    const shouldAccumulatePayouts = payoutOption === "accumulate";
    const depositInterestRate = 0.005;

    const shouldIncludeTax = taxMode === "include";
    const annualTaxCap = toNumber(taxAllowanceCap, 100000) || 100000;
    const usedAllowance = Math.max(0, toNumber(usedTaxAllowance, 0));
    const remainingTaxAllowance = shouldIncludeTax
      ? Math.max(0, annualTaxCap - usedAllowance)
      : 0;
    
    const taxRateDecimal = shouldIncludeTax
      ? Math.max(0, toNumber(taxRate, 0)) / 100
      : 0;
  
    const rows = [];
  
    let cumulativePremiumBeforeDiscount = 0;
    let cumulativeDiscount = 0;
    let cumulativePremiumAfterDiscount = 0;
  
    // รวมเงินคืนทั้งหมดตามกรมธรรม์ รวมเงินครบกำหนด
    let cumulativeCashback = 0;
  
    // กรณีรับเงินออก: เงินคืนที่เคยรับออกแล้วก่อนปีปัจจุบัน
    let cumulativeReceivedCashback = 0;
  
    // กรณีรับเงินออก: ผลตอบแทนดัชนีที่เคยรับออกแล้วก่อนปีปัจจุบัน
    let cumulativeReceivedLivingIndexBenefit = 0;
  
    // กรณีฝากสะสม: เงินคืนสะสมพร้อมดอกเบี้ย 0.5%
    let accumulatedCashbackBalance = 0;
  
    // กรณีฝากสะสม: ผลตอบแทนดัชนีสะสมพร้อมดอกเบี้ย 0.5%
    let accumulatedLivingIndexBenefitBalance = 0;
  
    // รวมผลตอบแทนดัชนีกรณีมีชีวิตอยู่ สำหรับ summary
    let cumulativeIndexBenefit = 0;

    let cumulativeTaxSaving = 0;
  
    for (let year = 1; year <= coverageYears; year++) {
      const isPremiumPayYear = year <= premiumPayYears;
      const isMaturityYear = year === coverageYears;
  
      const benefitRateRow = getYearlyBenefitRate(plan, year);
  
      const premiumBeforeDiscount = isPremiumPayYear
        ? roundMoney(annualPremiumBeforeDiscount)
        : 0;
  
      const discountAmount = isPremiumPayYear
        ? roundMoney(discountAmountPerYear)
        : 0;
  
      const premiumAfterDiscount = isPremiumPayYear
        ? roundMoney(annualPremiumAfterDiscount)
        : 0;

      const taxDeductiblePremium =
        shouldIncludeTax && isPremiumPayYear
          ? roundMoney(Math.min(premiumAfterDiscount, remainingTaxAllowance))
          : 0;
      
      const taxSaving = roundMoney(taxDeductiblePremium * taxRateDecimal);
      
      const taxValueForTotal = shouldIncludeTax
        ? roundMoney(cumulativeTaxSaving + taxSaving)
        : 0;
  
      cumulativePremiumBeforeDiscount = roundMoney(
        cumulativePremiumBeforeDiscount + premiumBeforeDiscount
      );
  
      cumulativeDiscount = roundMoney(cumulativeDiscount + discountAmount);
  
      cumulativePremiumAfterDiscount = roundMoney(
        cumulativePremiumAfterDiscount + premiumAfterDiscount
      );
  
      const livingBenefit = benefitRateRow
        ? scaleBenefitFromRate(plan, benefitRateRow.livingBenefit, sumAssured)
        : 0;
  
      const accumulatedLivingBenefit = benefitRateRow
        ? scaleBenefitFromRate(
            plan,
            benefitRateRow.accumulatedLivingBenefit,
            sumAssured
          )
        : 0;
  
      const deathGuaranteed = benefitRateRow
        ? scaleBenefitFromRate(plan, benefitRateRow.deathGuaranteed, sumAssured)
        : 0;
  
      const surrenderGuaranteed = benefitRateRow
        ? scaleBenefitFromRate(
            plan,
            benefitRateRow.surrenderGuaranteed,
            sumAssured
          )
        : 0;
  
      const annualCashback = isMaturityYear ? 0 : livingBenefit;
      const guaranteedMaturityBenefit = isMaturityYear ? livingBenefit : 0;
  
      const baseIndexBenefit = calculateIndexFormulaAmount({
        policyYear: year,
        cumulativePremiumAfterDiscount,
        assumedIndexReturn,
        participationRate: indexParticipationRate
      });
  
      // กรณีมีชีวิตอยู่ ได้ผลตอบแทนดัชนี ณ ปีที่กำหนด เช่น ปี 10, 15
      const indexPayoutRate = getIndexPayoutRate(indexPayoutRates, year);
  
      const projectedIndexBenefit = roundMoney(
        baseIndexBenefit * indexPayoutRate
      );
  
      // สำคัญ:
      // ถ้าเวนคืน/เสียชีวิตในปีนี้ ให้ใช้มูลค่าที่ "มีอยู่ก่อนปีนี้"
      // เพื่อไม่ double count เงินคืน/ผลตอบแทนดัชนีที่เพิ่งจะจ่าย ณ สิ้นปีนี้
      const priorCashbackValue = shouldAccumulatePayouts
        ? accumulatedCashbackBalance
        : cumulativeReceivedCashback;
  
      const priorIndexValue = shouldAccumulatePayouts
        ? accumulatedLivingIndexBenefitBalance
        : cumulativeReceivedLivingIndexBenefit;
  
      const deathIndexPayoutRate = getIndexPayoutRate(
        deathIndexPayoutRates,
        year
      );
  
      const surrenderIndexPayoutRate = getIndexPayoutRate(
        surrenderIndexPayoutRates,
        year
      );
  
      const deathIndexBenefit = roundMoney(
        baseIndexBenefit * deathIndexPayoutRate
      );
  
      const surrenderIndexBenefit = roundMoney(
        baseIndexBenefit * surrenderIndexPayoutRate
      );
  
      const deathTotal = roundMoney(
        deathGuaranteed +
          deathIndexBenefit +
          priorCashbackValue +
          priorIndexValue +
          taxValueForTotal
      );
      
      const surrenderTotal = roundMoney(
        surrenderGuaranteed +
          surrenderIndexBenefit +
          priorCashbackValue +
          priorIndexValue +
          taxValueForTotal
      );
  
      const totalBenefitThisYear = roundMoney(
        livingBenefit + projectedIndexBenefit + taxSaving
      );
  
      // อัปเดตยอดหลังจบปีนี้ สำหรับใช้แสดงใน row และใช้เป็น prior ของปีถัดไป
      cumulativeCashback = roundMoney(cumulativeCashback + livingBenefit);
  
      cumulativeReceivedCashback = roundMoney(
        cumulativeReceivedCashback + livingBenefit
      );
  
      cumulativeIndexBenefit = roundMoney(
        cumulativeIndexBenefit + projectedIndexBenefit
      );
  
      cumulativeReceivedLivingIndexBenefit = roundMoney(
        cumulativeReceivedLivingIndexBenefit + projectedIndexBenefit
      );
  
      accumulatedCashbackBalance = roundMoney(
        accumulatedCashbackBalance * (1 + depositInterestRate) + livingBenefit
      );
  
      accumulatedLivingIndexBenefitBalance = roundMoney(
        accumulatedLivingIndexBenefitBalance * (1 + depositInterestRate) +
          projectedIndexBenefit
      );
  
      const carriedCashbackValue = shouldAccumulatePayouts
        ? accumulatedCashbackBalance
        : cumulativeReceivedCashback;
  
      const carriedIndexValue = shouldAccumulatePayouts
        ? accumulatedLivingIndexBenefitBalance
        : cumulativeReceivedLivingIndexBenefit;

      cumulativeTaxSaving = taxValueForTotal;
  
      rows.push({
        policyYear: year,
        age: toNumber(age) + year - 1,
  
        premiumBeforeDiscount,
        discountAmount,
        premiumAfterDiscount,

        taxMode,
        shouldIncludeTax,
        taxAllowanceCap: annualTaxCap,
        usedTaxAllowance: usedAllowance,
        remainingTaxAllowance,
        taxDeductiblePremium,
        taxSaving,
        cumulativeTaxSaving,
  
        cumulativePremiumBeforeDiscount,
        cumulativeDiscount,
        cumulativePremiumAfterDiscount,
  
        annualCashback,
        cumulativeCashback,
        cumulativeReceivedCashback,
  
        livingBenefit,
        accumulatedLivingBenefit,
  
        payoutOption,
        shouldAccumulatePayouts,
  
        priorCashbackValue,
        priorIndexValue,
        carriedCashbackValue,
        carriedIndexValue,
  
        indexPayoutRate,
        projectedIndexBenefit,
        cumulativeIndexBenefit,
        cumulativeReceivedLivingIndexBenefit,
        accumulatedLivingIndexBenefitBalance,
  
        guaranteedMaturityBenefit,
        totalBenefitThisYear,
  
        baseIndexBenefit,
  
        deathGuaranteed,
        deathIndexPayoutRate,
        deathIndexBenefit,
        deathTotal,
  
        surrenderGuaranteed,
        surrenderIndexPayoutRate,
        surrenderIndexBenefit,
        surrenderTotal
      });
    }
  
    return rows;
  }

  function calculateNpv(rate, cashflows) {
    return cashflows.reduce((sum, cashflow, index) => {
      return sum + cashflow / Math.pow(1 + rate, index);
    }, 0);
  }
  
  function calculateIrr(cashflows) {
    const values = cashflows.map((value) => Number(value) || 0);
  
    const hasPositive = values.some((value) => value > 0);
    const hasNegative = values.some((value) => value < 0);
  
    if (!hasPositive || !hasNegative) {
      return null;
    }
  
    let low = -0.999999;
    let high = 1;
  
    let lowNpv = calculateNpv(low, values);
    let highNpv = calculateNpv(high, values);
  
    let guard = 0;
  
    while (lowNpv * highNpv > 0 && high < 1000 && guard < 80) {
      high *= 2;
      highNpv = calculateNpv(high, values);
      guard += 1;
    }
  
    if (lowNpv * highNpv > 0) {
      return null;
    }
  
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const midNpv = calculateNpv(mid, values);
  
      if (Math.abs(midNpv) < 0.000001) {
        return mid;
      }
  
      if (lowNpv * midNpv > 0) {
        low = mid;
        lowNpv = midNpv;
      } else {
        high = mid;
      }
    }
  
    return (low + high) / 2;
  }
  
  function buildIrrCashflows({ yearlyTable, payoutOption, taxMode = "none" }) {
    if (!Array.isArray(yearlyTable) || yearlyTable.length === 0) {
      return [];
    }
  
    const finalIndex = yearlyTable.length - 1;
    const finalRow = yearlyTable[finalIndex];
  
    const cashflows = [];
  
    // t=0: จ่ายเบี้ยปีแรก
    cashflows.push(-(Number(yearlyTable[0].premiumAfterDiscount) || 0));
  
    yearlyTable.forEach((row, index) => {
      // เบี้ยปีถัดไป ถือว่าจ่ายตอนต้นปีถัดไป / ปลายปีปัจจุบัน
      const nextPremium =
        index + 1 < yearlyTable.length
          ? Number(yearlyTable[index + 1].premiumAfterDiscount) || 0
          : 0;
  
      let inflow = 0;

      const taxSaving =
        taxMode === "include" ? Number(row.taxSaving) || 0 : 0;
  
      if (payoutOption === "accumulate") {
        // ฝากสะสม: ไม่รับเงินระหว่างทาง รับยอดสะสมทั้งหมดตอนครบสัญญา
        if (index === finalIndex) {
          const finalCashback =
            Number(finalRow.carriedCashbackValue) ||
            Number(finalRow.accumulatedLivingBenefit) ||
            Number(finalRow.cumulativeCashback) ||
            0;
  
          const finalIndexBenefit =
            Number(finalRow.carriedIndexValue) ||
            Number(finalRow.cumulativeReceivedLivingIndexBenefit) ||
            Number(finalRow.cumulativeIndexBenefit) ||
            0;
  
          inflow = finalCashback + finalIndexBenefit;
        }
      } else {
        // รับออก: รับเงินคืนและผลตอบแทนดัชนีตามปีที่ถึงกำหนด
        inflow =
          (Number(row.livingBenefit) || 0) +
          (Number(row.projectedIndexBenefit) || 0);
      }
  
      cashflows.push(roundMoney(inflow + taxSaving - nextPremium));
    });
  
    return cashflows;
  }

  function calculateSurrenderIrrAtYear(quote, targetIndex) {
    if (!quote || !quote.ok || !Array.isArray(quote.yearlyTable)) {
      return null;
    }
  
    const rows = quote.yearlyTable;
    const s = quote.summary || {};
    const index = Math.max(0, Math.min(Number(targetIndex) || 0, rows.length - 1));
  
    const payoutOption = s.payoutOption === "accumulate" ? "accumulate" : "withdraw";
    const includeTax = s.taxMode === "include";
  
    const cashflows = [];
  
    // t=0: จ่ายเบี้ยปีแรก
    cashflows.push(-(Number(rows[0].premiumAfterDiscount) || 0));
  
    for (let i = 0; i <= index; i++) {
      const row = rows[i];
  
      const nextPremium =
        i + 1 <= index ? Number(rows[i + 1].premiumAfterDiscount) || 0 : 0;
  
      let inflow = 0;
  
      // ประหยัดภาษีถือเป็น cash benefit รายปี เฉพาะตอนเลือก “ลดหย่อน”
      if (includeTax) {
        inflow += Number(row.taxSaving) || 0;
      }
  
      // ถ้าเลือกรับเงินคืนออก รับเงินคืน/ดัชนีในปีก่อนหน้า
      // แต่ปีที่เวนคืน ไม่เอา livingBenefit ปีนั้นมาซ้ำ
      if (payoutOption === "withdraw" && i < index) {
        inflow += Number(row.livingBenefit) || 0;
        inflow += Number(row.projectedIndexBenefit) || 0;
      }
  
      // ปีที่เลือก = เวนคืน
      if (i === index) {
        if (payoutOption === "accumulate") {
          const taxPart = includeTax ? Number(row.cumulativeTaxSaving) || 0 : 0;
          inflow += Math.max(0, (Number(row.surrenderTotal) || 0) - taxPart);
        } else {
          inflow += Number(row.surrenderGuaranteed) || 0;
          inflow += Number(row.surrenderIndexBenefit) || 0;
        }
      }
  
      cashflows.push(roundMoney(inflow - nextPremium));
    }
  
    return calculateIrr(cashflows);
  }

  function calculateDeathIrrAtYear(quote, targetIndex) {
    if (!quote || !quote.ok || !Array.isArray(quote.yearlyTable)) {
      return null;
    }
  
    const rows = quote.yearlyTable;
    const s = quote.summary || {};
    const index = Math.max(0, Math.min(Number(targetIndex) || 0, rows.length - 1));
  
    const payoutOption = s.payoutOption === "accumulate" ? "accumulate" : "withdraw";
    const includeTax = s.taxMode === "include";
  
    const cashflows = [];
  
    cashflows.push(-(Number(rows[0].premiumAfterDiscount) || 0));
  
    for (let i = 0; i <= index; i++) {
      const row = rows[i];
  
      const nextPremium =
        i + 1 <= index ? Number(rows[i + 1].premiumAfterDiscount) || 0 : 0;
  
      let inflow = 0;
  
      if (includeTax) {
        inflow += Number(row.taxSaving) || 0;
      }
  
      if (payoutOption === "withdraw" && i < index) {
        inflow += Number(row.livingBenefit) || 0;
        inflow += Number(row.projectedIndexBenefit) || 0;
      }
  
      if (i === index) {
        if (payoutOption === "accumulate") {
          const taxPart = includeTax ? Number(row.cumulativeTaxSaving) || 0 : 0;
          inflow += Math.max(0, (Number(row.deathTotal) || 0) - taxPart);
        } else {
          inflow += Number(row.deathGuaranteed) || 0;
          inflow += Number(row.deathIndexBenefit) || 0;
        }
      }
  
      cashflows.push(roundMoney(inflow - nextPremium));
    }
  
    return calculateIrr(cashflows);
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
    const taxMode = input.taxMode === "include" ? "include" : "none";
    const taxRate = taxMode === "include" ? toNumber(input.taxRate, 0) : 0;
    const taxAllowanceCap = 100000;
    const usedTaxAllowance =
      taxMode === "include" ? Math.max(0, toNumber(input.usedTaxAllowance, 0)) : 0;
    const remainingTaxAllowance =
      taxMode === "include"
        ? Math.max(0, taxAllowanceCap - usedTaxAllowance)
        : 0;

    const payoutOption =
      input.payoutOption === "accumulate" ? "accumulate" : "withdraw";

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
      assumedIndexReturn,
      payoutOption,
      taxMode,
      taxRate,
      usedTaxAllowance,
      taxAllowanceCap
    });

    const finalRow = yearlyTable[yearlyTable.length - 1];

    const irrCashflows = buildIrrCashflows({
      yearlyTable,
      payoutOption,
      taxMode
    });
    
    const irrAtMaturity = calculateIrr(irrCashflows);
    
    const policyProjectedTotalBenefit =
      payoutOption === "accumulate"
        ? roundMoney(
            (Number(finalRow.carriedCashbackValue) ||
              Number(finalRow.accumulatedLivingBenefit) ||
              Number(finalRow.cumulativeCashback) ||
              0) +
              (Number(finalRow.carriedIndexValue) ||
                Number(finalRow.cumulativeReceivedLivingIndexBenefit) ||
                Number(finalRow.cumulativeIndexBenefit) ||
                0)
          )
        : roundMoney(
            (Number(finalRow.cumulativeCashback) || 0) +
              (Number(finalRow.cumulativeIndexBenefit) || 0)
          );
    
    const totalTaxSaving =
      taxMode === "include" ? Number(finalRow.cumulativeTaxSaving) || 0 : 0;
    
    const projectedTotalBenefit = roundMoney(
      policyProjectedTotalBenefit + totalTaxSaving
    );

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

        taxMode,
        taxRate,
        taxAllowanceCap,
        usedTaxAllowance,
        remainingTaxAllowance,
        annualTaxDeductiblePremium:
          yearlyTable.find((row) => row.premiumAfterDiscount > 0)?.taxDeductiblePremium || 0,
        annualTaxSaving:
          yearlyTable.find((row) => row.premiumAfterDiscount > 0)?.taxSaving || 0,
        totalTaxSaving,

      payoutOption,
      payoutOptionLabel:
        payoutOption === "accumulate"
          ? "ฝากสะสมไว้กับบริษัท 0.5% ต่อปี"
          : "รับเงินออกเมื่อถึงกำหนด",

      totalCashback: finalRow.cumulativeCashback,
      accumulatedLivingBenefit: finalRow.accumulatedLivingBenefit,
      totalProjectedIndexBenefit: finalRow.cumulativeIndexBenefit,
      guaranteedMaturityBenefit: finalRow.guaranteedMaturityBenefit,

      policyProjectedTotalBenefit,
      projectedTotalBenefit,
      irrAtMaturity,
      irrCashflows
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
      ["การรับเงินระหว่างสัญญา", s.payoutOptionLabel],
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

      "ลดหย่อนได้": row.taxDeductiblePremium || 0,
      "ประหยัดภาษี": row.taxSaving || 0,
      "ประหยัดภาษีสะสม": row.cumulativeTaxSaving || 0,
  
      "เงินคืน": row.livingBenefit,
      "เงินคืนสะสม/รับแล้ว": row.carriedCashbackValue,
  
      "อัตราจ่ายผลตอบแทนดัชนี": row.indexPayoutRate,
      "ผลตอบแทนดัชนีกรณีมีชีวิตอยู่": row.projectedIndexBenefit,
      "ผลตอบแทนดัชนีสะสม/รับแล้ว": row.carriedIndexValue,
  
      "ผลประโยชน์ครบกำหนด": row.guaranteedMaturityBenefit,
      "ผลประโยชน์รวมปีนี้": row.totalBenefitThisYear,
  
      "ผลตอบแทนดัชนีกรณีเวนคืน": row.surrenderIndexBenefit,
      "เงินค่าเวนคืนรับรอง": row.surrenderGuaranteed,
      "ผลประโยชน์รวมกรณีเวนคืน": row.surrenderTotal,
  
      "ผลตอบแทนดัชนีกรณีเสียชีวิต": row.deathIndexBenefit,
      "ความคุ้มครองชีวิตรับรอง": row.deathGuaranteed,
      "ผลประโยชน์รวมกรณีเสียชีวิต": row.deathTotal
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
    calculateSurrenderIrrAtYear,
    calculateDeathIrrAtYear,

    toSummaryRows,
    toYearlyTableRows,

    formatMoney,
    formatPercent,
    roundMoney,
    toNumber
  };
})();
