const fs=require("fs"),vm=require("vm"),assert=require("assert");
const c={console};c.window=c;vm.createContext(c);
for(const f of ["plans.js","calc.js"])vm.runInContext(fs.readFileSync(f,"utf8"),c,{filename:f});
const quote=(planId,extras={})=>c.GSCalc.calculateQuote({
 planId,age:30,gender:"male",sumAssured:100000,assumedIndexReturn:5,
 payoutOption:"withdraw",taxMode:"none",...extras
});
const q15=quote("GS_15_8"),q25=quote("GS_25_5");
assert(q15.ok && q25.ok,"original plans must work");
assert.strictEqual(q15.yearlyTable.length,15);assert.strictEqual(q25.yearlyTable.length,25);
for(const mode of ["withdraw","accumulate"]){
 const q=quote("GS_MIX",{mixPremium15:50000,mixPremium25:40000,payoutOption:mode});
 assert(q.ok,JSON.stringify(q.errors));assert.strictEqual(q.yearlyTable.length,25);
 const a=q.yearlyTable;
 assert(Math.abs(a[0].premiumAfterDiscount-90000)<0.03);
 assert(Math.abs(a[4].premiumAfterDiscount-90000)<0.03);
 assert(Math.abs(a[5].premiumAfterDiscount-50000)<0.03);
 assert.strictEqual(a[7].premiumAfterDiscount>0,true);
 assert.strictEqual(a[8].premiumAfterDiscount,0);
 assert(Math.abs(q.summary.totalPremiumAfterDiscount-(50000*8+40000*5))<0.1);
 assert(a[14].mixMaturityCashInflow>0);
 assert(a[24].mixCashInflow>0);
 assert(a[14].deathGuaranteed>0 && a[14].deathGuaranteed===q.components[1].yearlyTable[14].deathGuaranteed);
 assert(Number.isFinite(q.summary.irrAtMaturity),"Mix IRR");
 assert(q.summary.componentMaturityPayout15>0);
 const yearly15=q.components[0].yearlyTable;
 const yearly25=q.components[1].yearlyTable;
 assert(Math.abs(a[9].projectedIndexBenefit-(yearly15[9].projectedIndexBenefit+yearly25[9].projectedIndexBenefit))<0.02);
 const tax=quote("GS_MIX",{mixPremium15:70000,mixPremium25:70000,payoutOption:mode,taxMode:"include",taxRate:20,usedTaxAllowance:10000});
 assert(tax.ok,JSON.stringify(tax.errors));assert(tax.yearlyTable[0].taxDeductiblePremium<=90000);
 assert(tax.yearlyTable[0].taxSaving<=18000);
 assert(tax.yearlyTable[5].premiumAfterDiscount<tax.yearlyTable[0].premiumAfterDiscount);
 console.log("PASS",mode,"IRR",q.summary.irrAtMaturity.toFixed(6));
}
const invalid=quote("GS_MIX",{mixPremium15:100,mixPremium25:40000});
assert(!invalid.ok,"reject below-minimum component");
console.log("PASS original plans, Mix validation, 25-year cashflows, tax and 15-year maturity");
