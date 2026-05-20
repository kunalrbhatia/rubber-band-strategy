import fs from 'fs/promises';
import path from 'path';
import { logger } from '../helpers/logger.js';
import { config } from '../config/env.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const KILL_FILE = path.join(process.cwd(), '.kill');
const MANUAL_FILE = path.join(process.cwd(), '.manual');
const PAPER_FILE = path.join(process.cwd(), '.paper');

class AppStateStore {
  private _isKillSwitchActive: boolean = false;
  private _isManualMode: boolean = false;
  private _isPaperTrading: boolean = config.paperTrading;
  private _pendingTrade: any = null;

  async init(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      this._isKillSwitchActive = await fs.access(KILL_FILE).then(() => true).catch(() => false);
      this._isManualMode = await fs.access(MANUAL_FILE).then(() => true).catch(() => false);
      
      // For paper trading, respect the .paper file if it exists, otherwise default to env
      const paperFileExists = await fs.access(PAPER_FILE).then(() => true).catch(() => false);
      if (paperFileExists) {
        this._isPaperTrading = true;
      } else if (config.paperTrading === false) {
        // If env says live, and no .paper file, it's live
        this._isPaperTrading = false;
      } else {
        // If env says paper, ensure the file exists for consistency
        this._isPaperTrading = true;
        await fs.writeFile(PAPER_FILE, '', 'utf-8');
      }

      logger.info(`App state initialized: Kill=${this._isKillSwitchActive}, Manual=${this._isManualMode}, Paper=${this._isPaperTrading}`);
    } catch (error: any) {
      logger.error(`Failed to initialize AppStateStore: ${error.message}`);
    }
  }

  get isKillSwitchActive(): boolean { return this._isKillSwitchActive; }
  get isManualMode(): boolean { return this._isManualMode; }
  get isPaperTrading(): boolean { return this._isPaperTrading; }
  get pendingTrade(): any { return this._pendingTrade; }

  async setKillSwitch(active: boolean): Promise<void> {
    this._isKillSwitchActive = active;
    if (active) await fs.writeFile(KILL_FILE, '', 'utf-8');
    else await fs.unlink(KILL_FILE).catch(() => {});
    logger.info(`Kill Switch ${active ? 'ACTIVATED' : 'DEACTIVATED'}`);
  }

  async setManualMode(active: boolean): Promise<void> {
    this._isManualMode = active;
    if (active) await fs.writeFile(MANUAL_FILE, '', 'utf-8');
    else await fs.unlink(MANUAL_FILE).catch(() => {});
    logger.info(`Manual Mode ${active ? 'ENABLED' : 'DISABLED'}`);
  }

  async setPaperTrading(active: boolean): Promise<void> {
    this._isPaperTrading = active;
    config.paperTrading = active; // Update env config as well
    if (active) await fs.writeFile(PAPER_FILE, '', 'utf-8');
    else await fs.unlink(PAPER_FILE).catch(() => {});
    logger.info(`Paper Trading ${active ? 'ENABLED' : 'DISABLED'}`);
  }

  setPendingTrade(trade: any): void {
    this._pendingTrade = trade;
  }

  clearPendingTrade(): void {
    this._pendingTrade = null;
  }
}

export const appStateStore = new AppStateStore();
