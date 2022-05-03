/* eslint-disable no-promise-executor-return */
import { tx, wallet } from '@cityofzion/neon-core';
import { config } from './config';
import { logger } from './utils/loggingUtils';
import { DapiUtils, genericSetHash, setOracleFee } from './utils/dapiUtils';

const properties = config.getProperties();

const PRIVATE_KEY: string = properties.privateKey;
const OWNER: wallet.Account = new wallet.Account(PRIVATE_KEY);
const DRY_RUN: boolean = properties.dryRun;

const NEST_SCRIPT_HASH = properties.nestScriptHash;
const BNEO_SCRIPT_HASH = properties.bneoScriptHash;
const BUSDL_SCRIPT_HASH = properties.busdlScriptHash;
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
  let transaction = await genericSetHash(NEST_SCRIPT_HASH, BNEO_SCRIPT_HASH, 'setBNEOScriptHash', OWNER);
  await submitTransaction(transaction, 'setBNEOScriptHash()');
  transaction = await genericSetHash(NEST_SCRIPT_HASH, USDL_SCRIPT_HASH, 'setUSDLScriptHash', OWNER);
  await submitTransaction(transaction, 'setUSDLScriptHash()');
  transaction = await genericSetHash(NEST_SCRIPT_HASH, BUSDL_SCRIPT_HASH, 'setBUSDLScriptHash', OWNER);
  await submitTransaction(transaction, 'setBUSDLScriptHash()');
  transaction = await genericSetHash(BUSDL_SCRIPT_HASH, USDL_SCRIPT_HASH, 'setUnderlyingScriptHash', OWNER);
  await submitTransaction(transaction, 'seUnderlyingScripttHash()');
  transaction = await genericSetHash(BUSDL_SCRIPT_HASH, NEST_SCRIPT_HASH, 'setNestScriptHash', OWNER);
  await submitTransaction(transaction, 'setNestScriptHash()');
  transaction = await setOracleFee(NEST_SCRIPT_HASH, 100_000_000, OWNER);
  await submitTransaction(transaction, 'setOracleFee()');
})();
