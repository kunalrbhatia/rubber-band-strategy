import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { TIME_CONSTANTS } from './constants.js';
import { downloadScripMaster } from './scripMaster.js';
import { scripMasterStore, ScripRecord } from '../store/scripMasterStore.js';
import { logger } from './logger.js';

const CACHE_FILE = path.join(process.cwd(), 'data', 'scrip-master-cache.json');

export interface ScripMasterCacheFile {
  cachedDate: string;
  records: ScripRecord[];
}

export const loadScripMaster = async (): Promise<ScripRecord[]> => {
  const today = format(toZonedTime(new Date(), TIME_CONSTANTS.TIMEZONE), 'yyyy-MM-dd');

  try {
    const fileExists = await fs.access(CACHE_FILE).then(() => true).catch(() => false);

    if (fileExists) {
      const content = await fs.readFile(CACHE_FILE, 'utf-8');
      const cache: ScripMasterCacheFile = JSON.parse(content);

      if (cache.cachedDate === today) {
        logger.info(`Scrip master loaded from cache (${cache.records.length} records)`);
        scripMasterStore.setRecords(cache.records);
        return cache.records;
      }
      logger.info('Scrip master cache is stale, downloading fresh data...');
    }
  } catch (error) {
    logger.warn('Failed to read scrip master cache, downloading fresh data...');
  }

  const records = await downloadScripMaster();
  const cacheData: ScripMasterCacheFile = {
    cachedDate: today,
    records,
  };

  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf-8');
    logger.info(`Scrip master downloaded + cached (${records.length} records)`);
  } catch (error: any) {
    logger.warn(`Failed to write scrip master cache to disk: ${error.message}`);
  }

  scripMasterStore.setRecords(records);
  return records;
};
