import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import Investor from '../models/Investor.js';
import Expense from '../models/Expense.js';
import Collection from '../models/Collection.js';
import MoneyIn from '../models/MoneyIn.js';
import MoneyOut from '../models/MoneyOut.js';
import { calculateAllInvestors } from '../services/investorCalculator.js';

const router = Router();

/**
 * GET /api/bootstrap
 * Returns all data in the same shape as the frontend's APP_DATA constant.
 */
router.get('/', async (req, res, next) => {
  try {
    const [allVehicles, investors, expenses, collections, moneyIn, moneyOut] = await Promise.all([
      Vehicle.find().lean(),
      Investor.find().sort('name'),
      Expense.find().sort('-date'),
      Collection.find().sort('-date_won'),
      MoneyIn.find().sort('-date'),
      MoneyOut.find().sort('-date')
    ]);

    // Split vehicles into stock and sold
    const stock = [];
    const sold = [];
    for (const v of allVehicles) {
      // Compute days_in_stock for lean docs
      if (v.date_acquired) {
        const start = new Date(v.date_acquired);
        const end = v.date_sold ? new Date(v.date_sold) : new Date();
        v.days_in_stock = Math.max(0, Math.floor((end - start) / 86400000));
      } else {
        v.days_in_stock = 0;
      }
      if (v.status === 'Sold') {
        sold.push(v);
      } else {
        stock.push(v);
      }
    }

    // Calculate investor totals
    const investorsWithTotals = await calculateAllInvestors(investors);

    // Build monthly aggregation from sold vehicles
    const monthMap = new Map();
    for (const v of sold) {
      const m = v.month || '';
      if (!m) continue;
      if (!monthMap.has(m)) {
        monthMap.set(m, { month: m, cars_sold: 0, revenue: 0, gross_profit: 0, total_cost: 0 });
      }
      const entry = monthMap.get(m);
      entry.cars_sold++;
      entry.revenue += v.sold_price || 0;
      entry.gross_profit += v.profit || 0;
      entry.total_cost += v.total_cost || 0;
    }

    // Add expense totals per month
    for (const e of expenses) {
      const m = e.month || '';
      if (!m) continue;
      if (!monthMap.has(m)) {
        monthMap.set(m, { month: m, cars_sold: 0, revenue: 0, gross_profit: 0, total_cost: 0 });
      }
      monthMap.get(m).total_expenses = (monthMap.get(m).total_expenses || 0) + (e.amount || 0);
    }

    const monthly = Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => {
        const d = new Date(m.month);
        return {
          ...m,
          label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          net_profit: m.gross_profit - (m.total_expenses || 0)
        };
      });

    res.json({
      stock,
      sold,
      collections,
      investors: investorsWithTotals,
      expenses,
      money_in: moneyIn,
      money_out: moneyOut,
      monthly
    });
  } catch (err) {
    next(err);
  }
});

export default router;
