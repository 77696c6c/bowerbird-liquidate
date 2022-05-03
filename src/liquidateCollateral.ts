/* eslint-disable no-promise-executor-return */
import { tx, wallet } from '@cityofzion/neon-core';
import { config } from './config';
import { logger } from './utils/loggingUtils';
import { DapiUtils } from './utils/dapiUtils';

const properties = config.getProperties();

const PRIVATE_KEY: string = properties.privateKey;
const OWNER: wallet.Account = new wallet.Account(PRIVATE_KEY);
const DRY_RUN: boolean = properties.dryRun;

const NEST_SCRIPT_HASH = properties.nestScriptHash;
const BNEO_SCRIPT_HASH = properties.bneoScriptHash;
const USDL_SCRIPT_HASH = properties.usdlScriptHash;

async function submitTransaction(
  transaction: tx.Transaction,
  description: string,
) {
  await DapiUtils.checkNetworkFee(transaction);
  await DapiUtils.checkSystemFee(transaction);
  if (DRY_RUN) {
    logger.info(`Not submitting ${description} transaction since dry run...`);
    return null;
  }
  logger.info(`Submitting ${description} transaction...`);
  return DapiUtils.performTransfer(transaction, OWNER);
}

(async () => {
  const args = process.argv;
  if (args.length < 4) {
    logger.error(`Usage: ${args[0]} ${args[1]} <quantity> <address>`);
    process.exit(1);
  }

  const quantity = parseInt(process.argv[2], 10);
  const address = process.argv[3];

  const transaction = await DapiUtils.liquidate(
    NEST_SCRIPT_HASH,
    USDL_SCRIPT_HASH,
    BNEO_SCRIPT_HASH,
    quantity,
    wallet.getScriptHashFromAddress(address),
    OWNER,
  );
  await submitTransaction(transaction, 'liquidate()');
})();
