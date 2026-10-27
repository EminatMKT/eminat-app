import {quoteExpandedFamily} from '../family-pricing'
import type {Plan,SaleDuration} from '../pricing'

export type FamilyInvoiceSnapshot={
  plan:Plan;membership_type:string;duration:SaleDuration;amount_cents:number;
  purpose?:string;additional_member_count?:number;family_policy_version?:string|null;
  family_base_amount_cents?:number|null;family_additional_unit_cents?:number|null;
  family_pricing_snapshot?:unknown;
}
export type FamilyInvoiceLine={quantity:number;unitCents:number;description:string}
/** New Family invoices use immutable database quotes. Legacy one-line invoices
 * keep their existing provider payload and reconciliation behavior. */
export function familyInvoiceLines(snapshot:FamilyInvoiceSnapshot):FamilyInvoiceLine[]|undefined {
  if(snapshot.family_policy_version==null && !snapshot.additional_member_count)return undefined
  const count=snapshot.additional_member_count,base=snapshot.family_base_amount_cents,unit=snapshot.family_additional_unit_cents
  if(snapshot.membership_type!=='FAMILY' || snapshot.family_policy_version!=='FAMILY_EXPANSION_V1' ||
    typeof count!=='number' || !Number.isSafeInteger(count) || count<0 || count>9 || typeof base!=='number' || !Number.isSafeInteger(base) || base<0 ||
    typeof unit!=='number' || !Number.isSafeInteger(unit) || unit<=0 || !Number.isSafeInteger(snapshot.amount_cents) ||
    base+unit*count !==snapshot.amount_cents)throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
  const quote=snapshot.family_pricing_snapshot
  if(!quote || typeof quote!=='object' || Array.isArray(quote))throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
  const q=quote as Record<string,unknown>
  if(q.count!==count || q.perMemberCents!==unit || q.totalCents!==snapshot.amount_cents)
    throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
  if(snapshot.purpose==='FAMILY_ADDITION') {
    if(!count || base!==0 || q.version!=='CALENDAR_MONTH_DAYS_V1' || typeof q.asOf!=='string' || typeof q.expiresAt!=='string')
      throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
    return [{quantity:count,unitCents:unit,description:`Corazón Salud additional family members · ${q.asOf} – ${q.expiresAt}`}]
  }
  if(snapshot.purpose!==undefined && !['ENROLLMENT','RENEWAL'].includes(snapshot.purpose))throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
  const expected=quoteExpandedFamily(snapshot.plan,snapshot.duration,count,snapshot.purpose==='RENEWAL')
  if(base!==expected.baseCents || unit!==expected.additionalUnitCents || q.months!==expected.initialMonths || q.version!=='FAMILY_EXPANSION_V1')
    throw new Error('FAMILY_INVOICE_SNAPSHOT_INVALID')
  // Family +0 retains the original provider payload; the job still carries its quote.
  return count ? [
    {quantity:1,unitCents:base,description:'Corazón Salud FAMILY membership · 3 included people'},
    {quantity:count,unitCents:unit,description:`Additional family members · ${expected.initialMonths} month(s) per person`},
  ] : undefined
}

export function familyInvoiceItemsMatch(lines:ReadonlyArray<{
  Amount:number;DetailType?:string;
  SalesItemLineDetail?:{ItemRef:{value:string};Qty?:number;UnitPrice?:number}
}>|undefined,itemId:string,expected:FamilyInvoiceLine[]) {
  const items=(lines??[]).filter(line=>line.SalesItemLineDetail)
  if(items.length!==expected.length)return false
  const remaining=[...expected]
  for(const item of items) {
    const detail=item.SalesItemLineDetail!
    if(item.DetailType!=='SalesItemLineDetail' || detail.ItemRef.value!==itemId)return false
    const index=remaining.findIndex(line=>detail.Qty===line.quantity && detail.UnitPrice!==undefined &&
      Math.abs(detail.UnitPrice*100-line.unitCents)<0.00001 && Math.abs(item.Amount*100-line.quantity*line.unitCents)<0.00001)
    if(index<0)return false
    remaining.splice(index,1)
  }
  // Subtotals are harmless; unexpected discounts/charges cannot hide behind a correct total.
  return (lines??[]).every(line=>line.SalesItemLineDetail || line.DetailType==='SubTotalLineDetail')
}
