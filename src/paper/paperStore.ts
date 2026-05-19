import fs from 'fs/promises';
import path from 'path';
import { logger } from '../helpers/logger.js';

export interface PaperTrade {
  id: string;
  date: string;
  entryTime: string;
  exitTime: string | null;
  underlying: 'NIFTY';
  optionType: 'CE' | 'PE';
  expiry: string;
  lotSize: number;
  quantity: number;
  sellSymbol: string;
  sellStrike: number;
  sellEntryPremium: number;
  sellExitPremium: number | null;
  buySymbol: string;
  buyStrike: number;
  buyEntryPremium: number;
  buyExitPremium: number | null;
  netCreditAtEntry: number;
  netCreditAtExit: number | null;
  usedMargin: number;
  targetPnl: number;
  slPnl: number;
  rsiAtEntry: number;
  status: 'OPEN' | 'CLOSED';
  exitReason: 'TARGET' | 'SL_HIT' | 'EOD' | null;
  pnl: number | null;
}

export interface PaperStoreData {
  trades: PaperTrade[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'paper-trades.json');

class PaperStore {
  private data: PaperStoreData = { trades: [] };

  async init(): Promise<void> {
    try {
      const fileExists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
      if (fileExists) {
        const content = await fs.readFile(DATA_FILE, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        await this.save();
      }
    } catch (error) {
      logger.error('Failed to initialize paper store');
    }
  }

  async addTrade(trade: PaperTrade): Promise<void> {
    this.data.trades.push(trade);
    await this.save();
  }

  async updateTrade(id: string, updates: Partial<PaperTrade>): Promise<void> {
    const index = this.data.trades.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.data.trades[index] = { ...this.data.trades[index], ...updates };
      await this.save();
    }
  }

  getAllTrades(): PaperTrade[] {
    return this.data.trades;
  }

  private async save(): Promise<void> {
    const tempFile = `${DATA_FILE}.tmp`;
    try {
      await fs.writeFile(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.rename(tempFile, DATA_FILE);
    } catch (error) {
      logger.error('Failed to save paper store');
    }
  }

  getSummary() {
    const trades = this.data.trades.filter((t) => t.status === 'CLOSED');
    const totalTrades = trades.length;
    const winners = trades.filter((t) => (t.pnl || 0) > 0).length;
    const losers = trades.filter((t) => (t.pnl || 0) <= 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

    return { totalTrades, winners, losers, totalPnl, avgPnl };
  }
}

export const paperStore = new PaperStore();
