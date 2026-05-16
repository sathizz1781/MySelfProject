import connectDB from '../../../lib/mongodb';
import Investment from '../../../models/Investment';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const investment = await Investment.findById(id);
  if (!investment) return res.status(404).json({ error: 'Not found.' });
  if (investment.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { name, type, investedAmount, currentValue, units, avgPrice, currency, startDate, maturityDate, notes, isActive, schemeCode, stockSymbol, stockExchange, lastPriceAt } = req.body;
    if (name           !== undefined) investment.name           = name;
    if (type           !== undefined) investment.type           = type;
    if (investedAmount !== undefined) investment.investedAmount = Number(investedAmount);
    if (currentValue   !== undefined) investment.currentValue   = Number(currentValue);
    if (units          !== undefined) investment.units          = Number(units);
    if (avgPrice       !== undefined) investment.avgPrice       = Number(avgPrice);
    if (currency       !== undefined) investment.currency       = currency;
    if (startDate      !== undefined) investment.startDate      = new Date(startDate);
    if (maturityDate   !== undefined) investment.maturityDate   = maturityDate ? new Date(maturityDate) : undefined;
    if (notes          !== undefined) investment.notes          = notes;
    if (isActive       !== undefined) investment.isActive       = Boolean(isActive);
    if (schemeCode     !== undefined) investment.schemeCode     = schemeCode;
    if (stockSymbol    !== undefined) investment.stockSymbol    = stockSymbol;
    if (stockExchange  !== undefined) investment.stockExchange  = stockExchange;
    if (lastPriceAt    !== undefined) investment.lastPriceAt    = lastPriceAt ? new Date(lastPriceAt) : undefined;
    await investment.save();
    return res.status(200).json({ investment });
  }

  if (req.method === 'DELETE') {
    await investment.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
