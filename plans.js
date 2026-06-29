// plans.js
// ข้อมูลหลักของแผน Global Saving
// เก็บเฉพาะข้อมูล config ของแผน ไม่ใส่ logic คำนวณในไฟล์นี้

const PLANS = {
  GS_15_8: {
    id: "GS_15_8",
    productName: "Global Saving",
    planName: "Global Saving 15/8",
    displayName: "Global Saving 15/8",
    code: "E15G8A",

    coverageYears: 15,
    premiumPayYears: 8,

    basePremiumRate: 0.999,
    basePremiumFormulaLabel: "เบี้ยก่อนส่วนลด = ทุนประกัน × 99.9%",

    sampleSumAssured: 20000,
    benefitRateBase: 1000,

    // ค่าจาก PDF แปลงเป็นอัตราต่อทุนประกัน 1,000 บาท
    // livingBenefit = เงินจ่ายคืนตามกรมธรรม์ + เงินครบกำหนดสัญญา ณ สิ้นปี
    // accumulatedLivingBenefit = กรณีสะสมไว้กับบริษัทฯ ด้วยดอกเบี้ยขั้นต่ำ 0.5% ต่อปี
    // deathGuaranteed = ความคุ้มครองกรณีเสียชีวิตรับรองการจ่าย
    // surrenderGuaranteed = เงินค่าเวนคืนกรมธรรม์รับรองการจ่าย
    yearlyBenefitRates: [
      { year: 1, livingBenefit: 10.0000, accumulatedLivingBenefit: 10.0000, deathGuaranteed: 1018.9800, deathTotal: 1018.9800, surrenderGuaranteed: 0.0000, surrenderTotal: 0.0000 },
      { year: 2, livingBenefit: 10.0000, accumulatedLivingBenefit: 20.0500, deathGuaranteed: 2037.9600, deathTotal: 2037.9600, surrenderGuaranteed: 119.0000, surrenderTotal: 119.0000 },
      { year: 3, livingBenefit: 10.0000, accumulatedLivingBenefit: 30.1505, deathGuaranteed: 3150.0000, deathTotal: 3150.0000, surrenderGuaranteed: 953.0000, surrenderTotal: 953.0000 },
      { year: 4, livingBenefit: 10.0000, accumulatedLivingBenefit: 40.3010, deathGuaranteed: 4200.0000, deathTotal: 4200.0000, surrenderGuaranteed: 1986.0000, surrenderTotal: 1986.0000 },
      { year: 5, livingBenefit: 10.0000, accumulatedLivingBenefit: 50.5025, deathGuaranteed: 5250.0000, deathTotal: 5250.0000, surrenderGuaranteed: 3252.0000, surrenderTotal: 3252.0000 },
      { year: 6, livingBenefit: 10.0000, accumulatedLivingBenefit: 60.7550, deathGuaranteed: 6300.0000, deathTotal: 6300.0000, surrenderGuaranteed: 4329.0000, surrenderTotal: 4329.0000 },
      { year: 7, livingBenefit: 10.0000, accumulatedLivingBenefit: 71.0590, deathGuaranteed: 7350.0000, deathTotal: 7350.0000, surrenderGuaranteed: 5438.0000, surrenderTotal: 5438.0000 },
      { year: 8, livingBenefit: 10.0000, accumulatedLivingBenefit: 81.4140, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 6581.0000, surrenderTotal: 6581.0000 },
      { year: 9, livingBenefit: 10.0000, accumulatedLivingBenefit: 91.8210, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 6765.0000, surrenderTotal: 6765.0000 },
      { year: 10, livingBenefit: 10.0000, accumulatedLivingBenefit: 102.2805, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 6956.0000, surrenderTotal: 6956.0000 },
      { year: 11, livingBenefit: 10.0000, accumulatedLivingBenefit: 112.7915, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 7152.0000, surrenderTotal: 7152.0000 },
      { year: 12, livingBenefit: 10.0000, accumulatedLivingBenefit: 123.3555, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 7354.0000, surrenderTotal: 7354.0000 },
      { year: 13, livingBenefit: 10.0000, accumulatedLivingBenefit: 133.9725, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 7563.0000, surrenderTotal: 7563.0000 },
      { year: 14, livingBenefit: 10.0000, accumulatedLivingBenefit: 144.6425, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 7778.0000, surrenderTotal: 7778.0000 },
      { year: 15, livingBenefit: 8010.0000, accumulatedLivingBenefit: 8155.3655, deathGuaranteed: 8350.0000, deathTotal: 8350.0000, surrenderGuaranteed: 8010.0000, surrenderTotal: 8010.0000 }
    ],

    minSumAssured: 20000,
    maxSumAssured: null,

    currency: "THB",
    paymentMode: "รายปี",

    description: "แผน Global Saving ระยะคุ้มครอง 15 ปี ชำระเบี้ย 8 ปี",

    indexReturnYears: [10, 15],

    // ใช้เป็น default เบื้องต้น แก้ได้ตอนกรอกหน้าเว็บ
    defaultInput: {
      gender: "male",
      age: 30,
      sumAssured: 100000,
      annualPremium: 0,
      assumedIndexReturn: 0,
      taxRate: 0
    }
  },

  GS_25_5: {
    id: "GS_25_5",
    productName: "Global Saving",
    planName: "Global Saving 25/5",
    displayName: "Global Saving 25/5",
    code: "E25G5A",

    coverageYears: 25,
    premiumPayYears: 5,

    basePremiumRate: 1.0,
    basePremiumFormulaLabel: "เบี้ยก่อนส่วนลด = ทุนประกัน × 100%",

    sampleSumAssured: 20000,
    benefitRateBase: 1000,

    // ค่าจาก PDF แปลงเป็นอัตราต่อทุนประกัน 1,000 บาท
    yearlyBenefitRates: [
      { year: 1, livingBenefit: 10.0000, accumulatedLivingBenefit: 10.0000, deathGuaranteed: 1020.0000, deathTotal: 1020.0000, surrenderGuaranteed: 0.0000, surrenderTotal: 0.0000 },
      { year: 2, livingBenefit: 10.0000, accumulatedLivingBenefit: 20.0500, deathGuaranteed: 2040.0000, deathTotal: 2040.0000, surrenderGuaranteed: 4.0000, surrenderTotal: 4.0000 },
      { year: 3, livingBenefit: 10.0000, accumulatedLivingBenefit: 30.1505, deathGuaranteed: 3150.0000, deathTotal: 3150.0000, surrenderGuaranteed: 736.0000, surrenderTotal: 736.0000 },
      { year: 4, livingBenefit: 10.0000, accumulatedLivingBenefit: 40.3010, deathGuaranteed: 4200.0000, deathTotal: 4200.0000, surrenderGuaranteed: 1735.0000, surrenderTotal: 1735.0000 },
      { year: 5, livingBenefit: 10.0000, accumulatedLivingBenefit: 50.5025, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 2966.0000, surrenderTotal: 2966.0000 },
      { year: 6, livingBenefit: 10.0000, accumulatedLivingBenefit: 60.7550, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3042.0000, surrenderTotal: 3042.0000 },
      { year: 7, livingBenefit: 10.0000, accumulatedLivingBenefit: 71.0590, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3119.0000, surrenderTotal: 3119.0000 },
      { year: 8, livingBenefit: 10.0000, accumulatedLivingBenefit: 81.4140, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3199.0000, surrenderTotal: 3199.0000 },
      { year: 9, livingBenefit: 10.0000, accumulatedLivingBenefit: 91.8210, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3282.0000, surrenderTotal: 3282.0000 },
      { year: 10, livingBenefit: 10.0000, accumulatedLivingBenefit: 102.2805, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3367.0000, surrenderTotal: 3367.0000 },
      { year: 11, livingBenefit: 10.0000, accumulatedLivingBenefit: 112.7915, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3454.0000, surrenderTotal: 3454.0000 },
      { year: 12, livingBenefit: 10.0000, accumulatedLivingBenefit: 123.3555, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3544.0000, surrenderTotal: 3544.0000 },
      { year: 13, livingBenefit: 10.0000, accumulatedLivingBenefit: 133.9725, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3637.0000, surrenderTotal: 3637.0000 },
      { year: 14, livingBenefit: 10.0000, accumulatedLivingBenefit: 144.6425, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3733.0000, surrenderTotal: 3733.0000 },
      { year: 15, livingBenefit: 10.0000, accumulatedLivingBenefit: 155.3655, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3831.0000, surrenderTotal: 3831.0000 },
      { year: 16, livingBenefit: 10.0000, accumulatedLivingBenefit: 166.1425, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 3933.0000, surrenderTotal: 3933.0000 },
      { year: 17, livingBenefit: 10.0000, accumulatedLivingBenefit: 176.9730, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4037.0000, surrenderTotal: 4037.0000 },
      { year: 18, livingBenefit: 10.0000, accumulatedLivingBenefit: 187.8580, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4145.0000, surrenderTotal: 4145.0000 },
      { year: 19, livingBenefit: 10.0000, accumulatedLivingBenefit: 198.7970, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4256.0000, surrenderTotal: 4256.0000 },
      { year: 20, livingBenefit: 10.0000, accumulatedLivingBenefit: 209.7910, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4370.0000, surrenderTotal: 4370.0000 },
      { year: 21, livingBenefit: 10.0000, accumulatedLivingBenefit: 220.8400, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4488.0000, surrenderTotal: 4488.0000 },
      { year: 22, livingBenefit: 10.0000, accumulatedLivingBenefit: 231.9445, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4610.0000, surrenderTotal: 4610.0000 },
      { year: 23, livingBenefit: 10.0000, accumulatedLivingBenefit: 243.1040, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4736.0000, surrenderTotal: 4736.0000 },
      { year: 24, livingBenefit: 10.0000, accumulatedLivingBenefit: 254.3195, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 4866.0000, surrenderTotal: 4866.0000 },
      { year: 25, livingBenefit: 5010.0000, accumulatedLivingBenefit: 5265.5910, deathGuaranteed: 5350.0000, deathTotal: 5350.0000, surrenderGuaranteed: 5010.0000, surrenderTotal: 5010.0000 }
    ],

    minSumAssured: 20000,
    maxSumAssured: null,

    currency: "THB",
    paymentMode: "รายปี",

    description: "แผน Global Saving ระยะคุ้มครอง 25 ปี ชำระเบี้ย 5 ปี",

    indexReturnYears: [10, 15, 20, 25],

    // ใช้เป็น default เบื้องต้น แก้ได้ตอนกรอกหน้าเว็บ
    defaultInput: {
      gender: "male",
      age: 30,
      sumAssured: 100000,
      annualPremium: 0,
      assumedIndexReturn: 0,
      taxRate: 0
    }
  }
};

// ส่วนลดเบี้ยตามทุนประกัน
const PREMIUM_DISCOUNTS = [
  {
    minSumAssured: 500000,
    discountRate: 0.01,
    label: "ทุนประกัน 500,000 บาทขึ้นไป ลด 1% ของทุนประกัน"
  },
  {
    minSumAssured: 100000,
    maxSumAssured: 499999,
    discountRate: 0.005,
    label: "ทุนประกัน 100,000–499,999 บาท ลด 0.5% ของทุนประกัน"
  }
];

// helper สำหรับดึงแผน
function getPlan(planId) {
  return PLANS[planId] || null;
}

// helper สำหรับดึงรายการแผนทั้งหมด
function getPlanList() {
  return Object.values(PLANS);
}

// helper สำหรับหา rate ส่วนลด
function getPremiumDiscountRate(sumAssured) {
  const amount = Number(sumAssured) || 0;

  const matched = PREMIUM_DISCOUNTS.find((tier) => {
    const aboveMin = amount >= tier.minSumAssured;
    const belowMax =
      tier.maxSumAssured == null || amount <= tier.maxSumAssured;

    return aboveMin && belowMax;
  });

  return matched ? matched.discountRate : 0;
}

// helper สำหรับข้อความส่วนลด
function getPremiumDiscountLabel(sumAssured) {
  const amount = Number(sumAssured) || 0;

  const matched = PREMIUM_DISCOUNTS.find((tier) => {
    const aboveMin = amount >= tier.minSumAssured;
    const belowMax =
      tier.maxSumAssured == null || amount <= tier.maxSumAssured;

    return aboveMin && belowMax;
  });

  return matched ? matched.label : "ไม่มีส่วนลดเบี้ย";
}
