// Display only: preserve decimal precision without converting API strings to Number.
export function formatMoney(value, empty = "—") {
    if (value == null || value === "") return empty;
    const raw = String(value);
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw.trim());
    if (!match) return raw;
    const fraction = (match[3] || "").padEnd(3, "0");
    let cents = BigInt(match[2]) * BigInt(100) + BigInt(fraction.slice(0, 2));
    if (fraction[2] >= "5") cents += BigInt(1);
    const digits = cents.toString().padStart(3, "0");
    const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${match[1] === "-" && cents !== BigInt(0) ? "-" : ""}${whole}.${digits.slice(-2)}`;
}

const moneyFields = new Set(["amount", "balance", "opening_balance", "invoice_total", "item_total", "item_sum",
    "total", "subtotal", "price", "unit_price", "tax_amount", "discount_amount", "contribution",
    "credit_total", "debit_total", "net_total", "paid_total", "amount_total", "invoice_payment_total",
    "estimated_withheld_fee", "estimated_deposit", "included_tax", "separate_fee_amount"]);
export const formatFinanceValue = (field, value) => moneyFields.has(field) ? formatMoney(value) : value;

// Known monetary workbook columns only; never group IDs, dates, quantities or percentages.
export function formatFinanceCell(cell) {
    const value = cell.readable_value !== undefined ? cell.readable_value : cell.value;
    const label = String(cell.column_label || "").trim().toLowerCase();
    return moneyFields.has(cell.field) || ["monto", "importe", "balance", "saldo"].includes(label) ? formatMoney(value) : value;
}
