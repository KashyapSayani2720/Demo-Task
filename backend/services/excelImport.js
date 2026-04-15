import ExcelJS from 'exceljs';
import { normalizePlate, normalizeDate, normalizeMonth, normalizeAmount, normalizeString } from './normalize.js';

const DEFAULT_INVESTOR_SPLIT = 0.3;

/**
 * Extract the actual value from an exceljs cell value.
 * Handles formula objects ({ formula, result }), Date objects, etc.
 */
function cellVal(v) {
  if (v == null) return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) return v.result;
    if ('sharedFormula' in v) return v.result ?? null;
    return null;
  }
  return v;
}

/**
 * Find a worksheet by name with normalized matching.
 * Handles differences in casing, spaces vs underscores/hyphens.
 * e.g. 'Money_in', 'Money in', 'Money In', 'money-in' all match.
 */
function findSheet(wb, ...names) {
  const norm = s => s.toLowerCase().replace(/[\s_\-]+/g, '');
  const targets = names.map(norm);
  // Exact match first (fast path)
  for (const name of names) {
    const ws = wb.getWorksheet(name);
    if (ws) return ws;
  }
  // Normalized match across all worksheets
  for (const ws of wb.worksheets) {
    if (targets.includes(norm(ws.name))) return ws;
  }
  return null;
}

/**
 * Get a value from a row object by trying multiple possible header names.
 * Returns the first non-empty match, or null.
 */
function getField(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

// Common header aliases for plate/registration fields
const PLATE_HEADERS = ['Number Plate reference', 'Plate Number', 'Number Plate', 'Plate', 'Reg', 'Registration'];

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
 * Auto-detect which row contains headers by looking for any of the known column names.
 * Original external Excel files have a title on row 1 and headers on row 2.
 * App-exported files have headers directly on row 1.
 */
function detectHeaderRow(ws, ...knownHeaders) {
  const targets = knownHeaders.map(h => h.toLowerCase());
  for (let r = 1; r <= 2; r++) {
    const row = ws.getRow(r);
    let found = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (targets.includes(normalizeString(cell.value).toLowerCase())) found = true;
    });
    if (found) return r;
  }
  return 2; // fallback to original layout
}

/**
 * Import Sold Stock sheet -> vehicle documents
 */
export function importSoldStock(ws) {
  const headerRow = detectHeaderRow(ws, ...PLATE_HEADERS, 'Make & Model');
  const rows = sheetToObjects(ws, headerRow);
  return rows
    .filter(r => getField(r, ...PLATE_HEADERS))
    .map(r => {
      const plateRaw = getField(r, ...PLATE_HEADERS);
      const profit = normalizeAmount(getField(r, 'Total Profit', 'Profit'));
      const investor = normalizeString(getField(r, 'SA/Investor Name', 'Investor', 'Investor/SA'));
      let investor_profit = normalizeAmount(getField(r, 'Investor Profit'));
      let mp_profit = normalizeAmount(getField(r, 'SA Profit'));

      // Apply default 50/50 split if Excel doesn't have explicit values
      if (investor && profit !== 0 && investor_profit === 0 && mp_profit === 0) {
        investor_profit = +(profit * DEFAULT_INVESTOR_SPLIT).toFixed(2);
        mp_profit = +(profit - investor_profit).toFixed(2);
      }

      return {
        plate: normalizePlate(plateRaw),
        make_model: normalizeString(getField(r, 'Make & Model', 'Make and Model', 'Vehicle')),
        month: normalizeMonth(getField(r, 'Month')),
        date_acquired: normalizeDate(getField(r, 'Date Aquired', 'Date Acquired', 'Date')),
        source: normalizeString(getField(r, 'Source')) || '',
        investor,
        purchase_price: normalizeAmount(getField(r, 'Purchase Price', 'Price')),
        recon_cost: normalizeAmount(getField(r, 'Reconditioning costs', 'Recon Cost', 'Recon')),
        px_value: normalizeAmount(getField(r, 'Part Ex', 'PX Value', 'Part Exchange')),
        total_cost: normalizeAmount(getField(r, 'Total Cost')),
        status: 'Sold',
        sold_price: normalizeAmount(getField(r, 'Sold', 'Sold Price')),
        profit,
        profit_share: normalizeString(getField(r, 'SA/Investor Profit Share', 'Profit Share')),
        investor_profit,
        mp_profit,
        date_listed: normalizeDate(getField(r, 'Date Listed')),
        date_sold: normalizeDate(getField(r, 'Date Sold')),
        platform: normalizeString(getField(r, 'Platfrom', 'Platform')),
        customer_name: normalizeString(getField(r, 'Customer Name')),
        contact_info: normalizeString(getField(r, 'Contact info', 'Contact Info')),
        warranty: normalizeString(getField(r, 'Warranty')),
        invoice_number: normalizeString(getField(r, 'Invoice Number')),
        autoguard: normalizeString(getField(r, 'AutoGuard Number', 'Autoguard')),
        notes: ''
      };
    });
}

/**
 * Import Stock Data sheet -> vehicle documents
 */
export function importStockData(ws) {
  const headerRow = detectHeaderRow(ws, ...PLATE_HEADERS, 'Make & Model');
  const rows = sheetToObjects(ws, headerRow);
  return rows
    .filter(r => getField(r, ...PLATE_HEADERS))
    .map(r => {
      const plateRaw = getField(r, ...PLATE_HEADERS);
      const price = normalizeAmount(getField(r, 'Price', 'Purchase Price'));
      const recon = normalizeAmount(getField(r, 'Reconditioning costs', 'Recon Cost', 'Recon'));
      const totalCostRaw = normalizeAmount(getField(r, 'Total Cost'));
      // Total Cost is a formula (SUM of Price + Recon). Use result if available, else compute.
      const total_cost = totalCostRaw > 0 ? totalCostRaw : price + recon;
      const soldVal = getField(r, 'Sold', 'Sold Price');
      const isSold = soldVal && soldVal !== '-' && normalizeAmount(soldVal) > 0;

      const VALID_STATUSES = ['In Stock', 'Live', 'Reserved', 'Sold', 'Delivered', 'SOR', 'Trade'];
      const rawStatus = normalizeString(getField(r, 'Status'));
      const isValidStatus = VALID_STATUSES.includes(rawStatus);

      const profit = normalizeAmount(getField(r, 'Profit', 'Total Profit'));
      const investor = normalizeString(getField(r, 'Investor/SA', 'SA/Investor Name', 'Investor'));
      let investor_profit = 0;
      let mp_profit = 0;

      if (isSold && profit !== 0) {
        if (investor) {
          investor_profit = +(profit * DEFAULT_INVESTOR_SPLIT).toFixed(2);
          mp_profit = +(profit - investor_profit).toFixed(2);
        } else {
          mp_profit = profit;
        }
      }

      return {
        plate: normalizePlate(plateRaw),
        make_model: normalizeString(getField(r, 'Make & Model', 'Make and Model', 'Vehicle')),
        month: normalizeMonth(getField(r, 'Month')),
        date_acquired: normalizeDate(getField(r, 'Date Aquired', 'Date Acquired', 'Date')),
        source: normalizeString(getField(r, 'Source')) || '',
        investor,
        purchase_price: price,
        recon_cost: recon,
        px_value: normalizeAmount(getField(r, 'PX Value', 'Part Ex', 'Part Exchange')),
        total_cost,
        status: isSold ? 'Sold' : (isValidStatus ? rawStatus : 'In Stock'),
        sold_price: isSold ? normalizeAmount(soldVal) : 0,
        profit,
        investor_profit,
        mp_profit,
        notes: isValidStatus ? '' : rawStatus // Non-enum status values go into notes
      };
    });
}

/**
 * Import Collection sheet
 */
export function importCollections(ws) {
  const headerRow = detectHeaderRow(ws, ...PLATE_HEADERS, 'Make & Model', 'Source');
  const rows = sheetToObjects(ws, headerRow);
  return rows
    .filter(r => getField(r, ...PLATE_HEADERS) || getField(r, 'Make & Model', 'Make and Model'))
    .map(r => {
      const obj = {
        plate: normalizePlate(getField(r, ...PLATE_HEADERS)),
        make_model: normalizeString(getField(r, 'Make & Model', 'Make and Model')),
        source: normalizeString(getField(r, 'Source')),
        date_won: normalizeDate(getField(r, 'Date Won')),
        collection_date: normalizeDate(getField(r, 'Collection Date')),
        address: normalizeString(getField(r, 'Location', 'Address')),
        postcode: normalizeString(getField(r, 'Post Code', 'Postcode')),
        distance_note: normalizeString(getField(r, 'How Far?', 'Distance')),
        number: normalizeString(getField(r, 'Number')),
        notes: normalizeString(getField(r, 'Additional notes', 'Notes')),
        status: 'Pending'
      };
      const id = normalizeString(getField(r, '_id'));
      if (id) obj._id = id;
      return obj;
    });
}

/**
 * Import Investor Budget sheet
 */
export function importInvestors(ws) {
  const headerRow = detectHeaderRow(ws, 'Investors', 'Investor', 'Name');
  const rows = sheetToObjects(ws, headerRow);
  return rows
    .filter(r => getField(r, 'Investors', 'Investor', 'Name'))
    .map(r => ({
      name: normalizeString(getField(r, 'Investors', 'Investor', 'Name')),
      initial_balance: normalizeAmount(getField(r, 'Initial Balance')),
      capital_returned: normalizeAmount(getField(r, 'Capital Returned'))
    }));
}

/**
 * Import Expense sheet
 */
export function importExpenses(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => {
    const obj = {
      month: normalizeMonth(r['Month']),
      date: normalizeDate(r['Date']),
      category: normalizeString(r['Category']),
      from: normalizeString(r['From']),
      amount: normalizeAmount(r['Amount'] || r['Amount ']), // header has trailing space
      payment_method: normalizeString(r['Payment Method']),
      paid_by: normalizeString(r['Paid By']),
      notes: normalizeString(r['Notes'])
    };
    const id = normalizeString(r['_id']);
    if (id) obj._id = id;
    return obj;
  });
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
  return rows.map(r => {
    const obj = {
      month: normalizeMonth(getField(r, 'Month')),
      date: normalizeDate(getField(r, 'Date')),
      category: normalizeString(getField(r, 'Category')),
      amount: normalizeAmount(getField(r, 'Amount', 'Amount ')),
      plate: normalizePlate(getField(r, 'Reg', ...PLATE_HEADERS)),
      notes: normalizeString(getField(r, 'Notes'))
    };
    const id = normalizeString(getField(r, '_id'));
    if (id) obj._id = id;
    return obj;
  });
}

/**
 * Import Money Out sheet
 */
export function importMoneyOut(ws) {
  const rows = sheetToObjects(ws, 1);
  return rows.map(r => {
    const obj = {
      month: normalizeMonth(getField(r, 'Month')),
      date: normalizeDate(getField(r, 'Date')),
      category: normalizeString(getField(r, 'Category')),
      amount: normalizeAmount(getField(r, 'Amount', 'Amount ')),
      notes: normalizeString(getField(r, 'Notes'))
    };
    const id = normalizeString(getField(r, '_id'));
    if (id) obj._id = id;
    return obj;
  });
}

/**
 * Read the workbook and return all parsed data
 */
export async function parseWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const sheetNames = wb.worksheets.map(ws => ws.name);
  console.log('[Excel Import] Sheets in workbook:', sheetNames);

  const find = (...names) => findSheet(wb, ...names);

  const soldStockWs = find('Sold Stock');
  const stockDataWs = find('Stock Data');
  const collectionWs = find('Collection', 'Collections');
  const investorWs = find('Investor Budget', 'Investors');
  const expenseWs = find('Expense', 'Expenses');
  const fuelExpenseWs = find('Fuel Expense');
  const investorCarExpenseWs = find('Investor Car Expense');
  const cashSpendingWs = find('Cash Spending');
  const moneyInWs = find('Money in', 'Money In');
  const moneyOutWs = find('Money Out');

  console.log('[Excel Import] Sheet matches:', {
    soldStock: soldStockWs?.name || 'NOT FOUND',
    stockData: stockDataWs?.name || 'NOT FOUND',
    collection: collectionWs?.name || 'NOT FOUND',
    investor: investorWs?.name || 'NOT FOUND',
    expense: expenseWs?.name || 'NOT FOUND',
    fuelExpense: fuelExpenseWs?.name || 'NOT FOUND',
    investorCarExpense: investorCarExpenseWs?.name || 'NOT FOUND',
    cashSpending: cashSpendingWs?.name || 'NOT FOUND',
    moneyIn: moneyInWs?.name || 'NOT FOUND',
    moneyOut: moneyOutWs?.name || 'NOT FOUND'
  });

  const result = {
    soldStock: soldStockWs ? importSoldStock(soldStockWs) : [],
    stockData: stockDataWs ? importStockData(stockDataWs) : [],
    collections: collectionWs ? importCollections(collectionWs) : [],
    investors: investorWs ? importInvestors(investorWs) : [],
    expenses: [
      ...(expenseWs ? importExpenses(expenseWs) : []),
      ...(fuelExpenseWs ? importFuelExpenses(fuelExpenseWs) : []),
      ...(investorCarExpenseWs ? importInvestorCarExpenses(investorCarExpenseWs) : []),
      ...(cashSpendingWs ? importCashSpending(cashSpendingWs) : [])
    ],
    moneyIn: moneyInWs ? importMoneyIn(moneyInWs) : [],
    moneyOut: moneyOutWs ? importMoneyOut(moneyOutWs) : []
  };

  console.log('[Excel Import] Parsed counts:', {
    soldStock: result.soldStock.length,
    stockData: result.stockData.length,
    collections: result.collections.length,
    investors: result.investors.length,
    expenses: result.expenses.length,
    moneyIn: result.moneyIn.length,
    moneyOut: result.moneyOut.length
  });

  return result;
}
