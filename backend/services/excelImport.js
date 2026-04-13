import ExcelJS from 'exceljs';
import { normalizePlate, normalizeDate, normalizeMonth, normalizeAmount, normalizeString } from './normalize.js';

/**
 * Extract the actual value from an exceljs cell value.
 * Handles formula objects ({ formula, result }), Date objects, etc.
 */
function cellVal(v) {
  if (v == null) return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    // Formula cell: { formula: '...', result: N }
    if ('result' in v) return v.result;
    // Shared formula
    if ('sharedFormula' in v) return v.result ?? null;
    return null;
  }
  return v;
}

/**
 * Read a worksheet into an array of objects using the header row.
 * @param {ExcelJS.Worksheet} ws
 * @param {number} headerRow - 1-based row number containing headers
 * @returns {Array<Object>}
 */
function sheetToObjects(ws, headerRow = 1) {
  const hRow = ws.getRow(headerRow);
  const headers = [];
  hRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = normalizeString(cell.value);
  });

  const rows = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = {};
    let hasData = false;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (!key) return;
      const val = cellVal(cell.value);
      obj[key] = val;
      if (val != null && val !== '' && val !== '-') hasData = true;
    });
    if (hasData) rows.push(obj);
  }
  return rows;
}

/**
 * Import Sold Stock sheet -> vehicle documents
 */
export function importSoldStock(ws) {
  const rows = sheetToObjects(ws, 2); // headers on row 2
  return rows
    .filter(r => r['Number Plate reference'])
    .map(r => ({
      plate: normalizePlate(r['Number Plate reference']),
      model: normalizeString(r['Make & Model']),
      month: normalizeMonth(r['Month']),
      date_acquired: normalizeDate(r['Date Aquired']),
      source: '',
      investor: normalizeString(r['SA/Investor Name']),
      purchase_price: 0,
      recon_cost: 0,
      px_value: normalizeAmount(r['Part Ex']),
      total_cost: normalizeAmount(r['Total Cost']),
      status: 'Sold',
      sold_price: normalizeAmount(r['Sold']),
      profit: normalizeAmount(r['Total Profit']),
      profit_share: normalizeString(r['SA/Investor Profit Share']),
      investor_profit: normalizeAmount(r['Investor Profit']),
      mp_profit: normalizeAmount(r['SA Profit']),
      date_listed: normalizeDate(r['Date Listed']),
      date_sold: normalizeDate(r['Date Sold']),
      platform: normalizeString(r['Platfrom']),
      customer_name: normalizeString(r['Customer Name']),
      contact_info: normalizeString(r['Contact info']),
      warranty: normalizeString(r['Warranty']),
      invoice_number: normalizeString(r['Invoice Number']),
      autoguard: normalizeString(r['AutoGuard Number']),
      notes: ''
    }));
}

/**
 * Import Stock Data sheet -> vehicle documents
 */
export function importStockData(ws) {
  const rows = sheetToObjects(ws, 2); // headers on row 2
  return rows
    .filter(r => r['Plate Number'])
    .map(r => {
      const price = normalizeAmount(r['Price']);
      const recon = normalizeAmount(r['Reconditioning costs']);
      const totalCostRaw = normalizeAmount(r['Total Cost']);
      // Total Cost is a formula (SUM of Price + Recon). Use result if available, else compute.
      const total_cost = totalCostRaw > 0 ? totalCostRaw : price + recon;
      const soldVal = r['Sold'];
      const isSold = soldVal && soldVal !== '-' && normalizeAmount(soldVal) > 0;

      const VALID_STATUSES = ['In Stock', 'Live', 'Reserved', 'Sold', 'Delivered', 'SOR', 'Trade'];
      const rawStatus = normalizeString(r['Status']);
      const isValidStatus = VALID_STATUSES.includes(rawStatus);

      return {
        plate: normalizePlate(r['Plate Number']),
        model: normalizeString(r['Make & Model']),
        month: normalizeMonth(r['Month']),
        date_acquired: normalizeDate(r['Date Aquired']),
        source: normalizeString(r['Source']),
        investor: normalizeString(r['Investor/SA']),
        purchase_price: price,
        recon_cost: recon,
        px_value: normalizeAmount(r['PX Value']),
        total_cost,
        status: isSold ? 'Sold' : (isValidStatus ? rawStatus : 'In Stock'),
        sold_price: isSold ? normalizeAmount(soldVal) : 0,
        profit: normalizeAmount(r['Profit']),
        notes: isValidStatus ? '' : rawStatus // Non-enum status values go into notes
      };
    });
}

/**
 * Import Collection sheet
 */
export function importCollections(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows
    .filter(r => r['Plate Number'] || r['Make & Model'])
    .map(r => ({
      plate: normalizePlate(r['Plate Number']),
      make_model: normalizeString(r['Make & Model']),
      source: normalizeString(r['Source']),
      date_won: normalizeDate(r['Date Won']),
      collection_date: normalizeDate(r['Collection Date']),
      address: normalizeString(r['Location']),
      postcode: normalizeString(r['Post Code']),
      distance_note: normalizeString(r['How Far?']),
      number: normalizeString(r['Number']),
      notes: normalizeString(r['Additional notes']),
      status: 'Pending'
    }));
}

/**
 * Import Investor Budget sheet
 */
export function importInvestors(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows
    .filter(r => r['Investors'])
    .map(r => ({
      name: normalizeString(r['Investors']),
      initial_balance: normalizeAmount(r['Initial Balance']),
      capital_returned: normalizeAmount(r['Capital Returned'])
    }));
}

/**
 * Import Expense sheet
 */
export function importExpenses(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: normalizeDate(r['Date']),
    category: normalizeString(r['Category']),
    from: normalizeString(r['From']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']), // header has trailing space
    payment_method: normalizeString(r['Payment Method']),
    paid_by: normalizeString(r['Paid By']),
    notes: normalizeString(r['Notes'])
  }));
}

/**
 * Import Fuel Expense sheet
 */
export function importFuelExpenses(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: normalizeDate(r['Date']),
    category: 'Fuel',
    from: normalizeString(r['Car']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']),
    payment_method: '',
    paid_by: '',
    notes: normalizeString(r['Column1'] || '')
  }));
}

/**
 * Import Investor Car Expense sheet
 */
export function importInvestorCarExpenses(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: normalizeDate(r['Date']),
    category: 'Investor Car Expense',
    from: normalizeString(r['Reason']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']),
    payment_method: '',
    paid_by: '',
    notes: '',
    plate: normalizePlate(r['Reg'])
  }));
}

/**
 * Import Cash Spending sheet
 */
export function importCashSpending(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: '',
    category: 'Cash',
    from: normalizeString(r['Cost Incurred on']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']),
    payment_method: 'Cash',
    paid_by: '',
    notes: normalizeString(r['Reason'])
  }));
}

/**
 * Import Money In sheet
 */
export function importMoneyIn(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: normalizeDate(r['Date']),
    category: normalizeString(r['Category']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']),
    plate: normalizePlate(r['Reg']),
    notes: normalizeString(r['Notes'])
  }));
}

/**
 * Import Money Out sheet
 */
export function importMoneyOut(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => ({
    month: normalizeMonth(r['Month']),
    date: normalizeDate(r['Date']),
    category: normalizeString(r['Category']),
    amount: normalizeAmount(r['Amount'] || r['Amount ']),
    notes: normalizeString(r['Notes'])
  }));
}

/**
 * Read the workbook and return all parsed data
 */
export async function parseWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const get = (name) => wb.getWorksheet(name);

  return {
    soldStock: get('Sold Stock') ? importSoldStock(get('Sold Stock')) : [],
    stockData: get('Stock Data') ? importStockData(get('Stock Data')) : [],
    collections: get('Collection') ? importCollections(get('Collection')) : [],
    investors: get('Investor Budget') ? importInvestors(get('Investor Budget')) : [],
    expenses: [
      ...(get('Expense') ? importExpenses(get('Expense')) : []),
      ...(get('Fuel Expense') ? importFuelExpenses(get('Fuel Expense')) : []),
      ...(get('Investor Car Expense') ? importInvestorCarExpenses(get('Investor Car Expense')) : []),
      ...(get('Cash Spending') ? importCashSpending(get('Cash Spending')) : [])
    ],
    moneyIn: get('Money in') ? importMoneyIn(get('Money in')) : [],
    moneyOut: get('Money Out') ? importMoneyOut(get('Money Out')) : []
  };
}
