export const sellerPromotionDays = [1,3,5,7,10,30] as const;
/** The existing database caps requested_days at 90. Month packages use explicit 30-day periods. */
export function promotionDuration(unit: string, amount: unknown) {
  if(unit === "lifetime") return {lifetime:true,days:1,label:"Ömürlük"};
  const value=Number(amount);
  if(!Number.isInteger(value) || value<1 || !["days","months"].includes(unit)) return null;
  const days=unit === "months" ? value*30 : value;
  if(days>90) return null;
  return {lifetime:false,days,label:unit === "months" ? `${value} ay (${days} gün)` : `${days} gün`};
}
export function promotionEnd(startsAt: Date, days: number) {
  if(!Number.isInteger(days) || days<1 || days>90) throw new Error("Önə çıxarma müddəti düzgün deyil.");
  return new Date(startsAt.getTime()+days*86400000).toISOString();
}
