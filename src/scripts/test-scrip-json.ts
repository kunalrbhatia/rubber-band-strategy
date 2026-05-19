import { downloadScripMaster } from '../helpers/scripMaster.js';
import { logger } from '../helpers/logger.js';
import { scripMasterStore } from '../store/scripMasterStore.js';

async function testScripJson() {
  try {
    logger.info('--- Starting Scrip Master JSON Test ---');

    const records = await downloadScripMaster();
    
    logger.info(`Total NFO Records: ${records.length}`);

    if (records.length === 0) {
      throw new Error('No records found in scrip master!');
    }

    // Check for a sample record
    const sample = records[0];
    logger.info('Sample Record Structure:');
    console.log(JSON.stringify(sample, null, 2));

    // Validate essential fields
    const requiredFields = ['token', 'symbol', 'name', 'expiry', 'strike', 'lotsize', 'instrumenttype', 'exch_seg'];
    for (const field of requiredFields) {
      if (!(field in sample)) {
        logger.error(`Missing required field: ${field}`);
      }
    }

    // Check for NIFTY records
    const niftyRecords = records.filter(r => r.name === 'NIFTY');
    logger.info(`NIFTY Records found: ${niftyRecords.length}`);

    if (niftyRecords.length === 0) {
      logger.warn('Warning: No NIFTY records found. This might be an issue if you plan to trade Nifty.');
    } else {
        const optionRecords = niftyRecords.filter(r => r.instrumenttype === 'OPTIDX');
        logger.info(`NIFTY Option Records (OPTIDX): ${optionRecords.length}`);
        
        if (optionRecords.length > 0) {
            logger.info('Sample NIFTY Option:');
            console.log(JSON.stringify(optionRecords[0], null, 2));
        }
    }

    logger.info('--- Scrip Master JSON Test Completed ---');
  } catch (error: any) {
    logger.error(`Scrip Master Test Failed: ${error.message}`);
    process.exit(1);
  }
}

testScripJson();
