import axios from 'axios';
import { ANGEL_ONE_URLS } from './constants.js';
import { ScripRecord } from '../store/scripMasterStore.js';
import { logger } from './logger.js';

export const downloadScripMaster = async (): Promise<ScripRecord[]> => {
  try {
    logger.info('Downloading scrip master from Angel One...');
    const response = await axios.get<ScripRecord[]>(ANGEL_ONE_URLS.SCRIP_MASTER);

    // Filter to NFO exchange only as per blueprint
    const filtered = response.data.filter((record) => record.exch_seg === 'NFO');
    logger.info(`Scrip master downloaded. Found ${filtered.length} NFO records.`);
    return filtered;
  } catch (error: any) {
    logger.error(`Failed to download scrip master: ${error.message}`);
    throw error;
  }
};
