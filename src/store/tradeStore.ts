export interface SpreadLeg {
  tradingSymbol: string;
  symbolToken: string;
  action: 'SELL' | 'BUY';
  strike: number;
  entryPremium: number;
  currentPremium: number;
}

export interface ActiveTrade {
  id: string;
  entryTime: string;
  underlying: 'NIFTY';
  optionType: 'CE' | 'PE';
  expiry: string;
  lotSize: number;
  quantity: number;
  sellLeg: SpreadLeg;
  buyLeg: SpreadLeg;
  netCreditAtEntry: number;
  usedMargin: number;
  targetPnl: number;
  slPnl: number;
  rsiAtEntry: number;
  mode: 'PAPER' | 'LIVE';
}

class TradeStore {
  private _activeTrade: ActiveTrade | null = null;
  private _dailySLHit = false;

  get activeTrade(): ActiveTrade | null {
    return this._activeTrade;
  }

  setActiveTrade(trade: ActiveTrade): void {
    this._activeTrade = trade;
  }

  clearActiveTrade(): void {
    this._activeTrade = null;
  }

  hasActiveTrade(): boolean {
    return this._activeTrade !== null;
  }

  getMtm(): number {
    if (!this._activeTrade) return 0;
    const currentNetCredit = this._activeTrade.sellLeg.currentPremium - this._activeTrade.buyLeg.currentPremium;
    return (this._activeTrade.netCreditAtEntry - currentNetCredit) * this._activeTrade.lotSize;
  }

  get dailySLHit(): boolean {
    return this._dailySLHit;
  }

  setDailySLHit(value: boolean): void {
    this._dailySLHit = value;
  }
}

export const tradeStore = new TradeStore();
