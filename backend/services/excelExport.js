import ExcelJS from 'exceljs';
import Vehicle from '../models/Vehicle.js';
import Investor from '../models/Investor.js';
import Expense from '../models/Expense.js';
import Collection from '../models/Collection.js';
import MoneyIn from '../models/MoneyIn.js';
import MoneyOut from '../models/MoneyOut.js';
import { calculateAllInvestors } from './investorCalculator.js';

export async function generateWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DealerOS';
  wb.created = new Date();

  const [allVehicles, investors, expenses, collections, moneyIn, moneyOut] = await Promise.all([
    Vehicle.find().lean(),
    Investor.find().sort('name'),
    Expense.find().sort('-date').lean(),
    Collection.find().sort('-date_won').lean(),
    MoneyIn.find().sort('-date').lean(),
    MoneyOut.find().sort('-date').lean()
  ]);

  const sold = allVehicles.filter(v => v.status === 'Sold');
  const stock = allVehicles.filter(v => v.status !== 'Sold');

  // Sold Stock sheet
  const sSheet = wb.addWorksheet('Sold Stock');
  sSheet.columns = [
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Date Aquired', key: 'date_acquired', width: 14 },
    { header: 'Number Plate reference', key: 'plate', width: 16 },
    { header: 'Make & Model', key: 'make_model', width: 20 },
    { header: 'SA/Investor Name', key: 'investor', width: 16 },
    { header: 'Total Cost', key: 'total_cost', width: 12 },
    { header: 'Sold', key: 'sold_price', width: 12 },
    { header: 'Part Ex', key: 'px_value', width: 10 },
    { header: 'SA/Investor Profit Share', key: 'profit_share', width: 14 },
    { header: 'Total Profit', key: 'profit', width: 12 },
    { header: 'Investor Profit', key: 'investor_profit', width: 14 },
    { header: 'SA Profit', key: 'mp_profit', width: 12 },
    { header: 'Date Listed', key: 'date_listed', width: 14 },
    { header: 'Date Sold', key: 'date_sold', width: 14 },
    { header: 'Days to Sell', key: 'days', width: 10 },
    { header: 'Platfrom', key: 'platform', width: 12 },
    { header: '', key: 'blank', width: 4 },
    { header: 'Invoice Number', key: 'invoice_number', width: 14 },
    { header: 'Customer Name', key: 'customer_name', width: 16 },
    { header: 'Contact info', key: 'contact_info', width: 16 },
    { header: 'Warranty', key: 'warranty', width: 12 },
    { header: 'AutoGuard Number', key: 'autoguard', width: 16 }
  ];
  for (const v of sold) {
    const start = v.date_acquired ? new Date(v.date_acquired) : null;
    const end = v.date_sold ? new Date(v.date_sold) : null;
    const days = start && end ? Math.floor((end - start) / 86400000) : '';
    sSheet.addRow({ ...v, days });
  }

  // Stock Data sheet
  const sdSheet = wb.addWorksheet('Stock Data');
  sdSheet.columns = [
    { header: '', key: 'blank', width: 4 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Date Aquired', key: 'date_acquired', width: 14 },
    { header: 'Plate Number', key: 'plate', width: 14 },
    { header: 'Make & Model', key: 'make_model', width: 20 },
    { header: 'Investor/SA', key: 'investor', width: 14 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'PX Value', key: 'px_value', width: 10 },
    { header: 'Price', key: 'purchase_price', width: 10 },
    { header: 'Reconditioning costs', key: 'recon_cost', width: 14 },
    { header: 'Total Cost', key: 'total_cost', width: 12 },
    { header: 'Sold', key: 'sold_price', width: 10 },
    { header: 'Profit', key: 'profit', width: 10 },
    { header: 'Status', key: 'status', width: 20 }
  ];
  for (const v of stock) sdSheet.addRow(v);

  // Collection sheet
  const cSheet = wb.addWorksheet('Collection');
  cSheet.columns = [
    { header: 'Source', key: 'source', width: 14 },
    { header: 'Date Won', key: 'date_won', width: 14 },
    { header: 'Plate Number', key: 'plate', width: 14 },
    { header: 'Make & Model', key: 'make_model', width: 20 },
    { header: 'Location', key: 'address', width: 24 },
    { header: 'Post Code', key: 'postcode', width: 12 },
    { header: 'How Far?', key: 'distance_note', width: 12 },
    { header: 'Collection Date', key: 'collection_date', width: 14 },
    { header: 'Number', key: 'number', width: 10 },
    { header: 'Additional notes', key: 'notes', width: 24 }
  ];
  for (const c of collections) cSheet.addRow(c);

  // Investor Budget sheet
  const invData = await calculateAllInvestors(investors);
  const iSheet = wb.addWorksheet('Investor Budget');
  iSheet.columns = [
    { header: 'Investors', key: 'name', width: 16 },
    { header: 'Initial Balance', key: 'initial_balance', width: 14 },
    { header: 'Capital Returned', key: 'capital_returned', width: 16 },
    { header: 'Total Balance', key: 'total_balance', width: 14 },
    { header: 'Purchased', key: 'purchased', width: 12 },
    { header: 'Total Profit (since Nov-25)', key: 'total_profit', width: 18 },
    { header: 'Available', key: 'available', width: 12 }
  ];
  for (const i of invData) iSheet.addRow(i);

  // Expense sheet
  const eSheet = wb.addWorksheet('Expense');
  eSheet.columns = [
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'From', key: 'from', width: 16 },
    { header: 'Amount ', key: 'amount', width: 10 },
    { header: 'Payment Method', key: 'payment_method', width: 14 },
    { header: 'Paid By', key: 'paid_by', width: 10 },
    { header: 'Notes', key: 'notes', width: 24 }
  ];
  for (const e of expenses) eSheet.addRow(e);

  // Money In sheet
  const miSheet = wb.addWorksheet('Money in');
  miSheet.columns = [
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Amount ', key: 'amount', width: 10 },
    { header: 'Reg', key: 'plate', width: 12 },
    { header: 'Notes', key: 'notes', width: 24 }
  ];
  for (const m of moneyIn) miSheet.addRow(m);

  // Money Out sheet
  const moSheet = wb.addWorksheet('Money Out');
  moSheet.columns = [
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Amount ', key: 'amount', width: 10 },
    { header: 'Notes', key: 'notes', width: 24 }
  ];
  for (const m of moneyOut) moSheet.addRow(m);

  return wb;
}
