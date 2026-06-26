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

    minSumAssured: 100000,
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

    minSumAssured: 100000,
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
    label: "ทุนประกัน 500,000 บาทขึ้นไป ลดเบี้ย 1%"
  },
  {
    minSumAssured: 100000,
    maxSumAssured: 499999,
    discountRate: 0.005,
    label: "ทุนประกัน 100,000–499,999 บาท ลดเบี้ย 0.5%"
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
