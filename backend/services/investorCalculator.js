import Vehicle from '../models/Vehicle.js';

export async function calculateInvestor(investor) {
  const vehicles = await Vehicle.find({ investor: investor.name });
  const purchased = vehicles.reduce((s, v) => s + (v.total_cost || 0), 0);
  const sold = vehicles.filter(v => v.status === 'Sold');
  const total_profit = sold.reduce((s, v) => s + (v.profit || 0), 0);
  const total_balance = (investor.initial_balance || 0) + total_profit - (investor.capital_returned || 0);
  const inStockCost = vehicles.filter(v => v.status !== 'Sold').reduce((s, v) => s + (v.total_cost || 0), 0);
  const available = total_balance - inStockCost;

  return {
    ...investor.toObject(),
    purchased: +purchased.toFixed(2),
    total_profit: +total_profit.toFixed(2),
    total_balance: +total_balance.toFixed(2),
    available: +available.toFixed(2)
  };
}

export async function calculateAllInvestors(investors) {
  return Promise.all(investors.map(inv => calculateInvestor(inv)));
}
