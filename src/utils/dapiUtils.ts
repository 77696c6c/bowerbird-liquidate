import {
  sc, rpc, tx, wallet, u, CONST,
} from '@cityofzion/neon-core';
import { config } from '../config';
import { logger } from './loggingUtils';

const properties = config.getProperties();

export type Account = {
  address: string,
};

export type AccountQuantity = {
  address: string,
  quantity: number,
};

// Network node
const RPC_NODE_URL: string = properties.rpcNodeUrl;
const RPC_CLIENT = new rpc.RPCClient(RPC_NODE_URL);
const NETWORK_MAGIC = properties.networkMagic;

// Entry point for all read operations
export async function genericReadCall(scriptHash: string, operation: string, args: any[]) {
  const result = await RPC_CLIENT.invokeFunction(scriptHash, operation, args);
  const retVal = result.stack[0].value;
  return retVal;
}

export async function getBalance(contractHash: string, account: wallet.Account) {
  return genericReadCall(
    contractHash,
    'balanceOf',
    [sc.ContractParam.hash160(account.address)],
  ).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getBusdlScriptHash(scriptHash: string) {
  return genericReadCall(scriptHash, 'getBUSDLScriptHash', [])
    .then((ret) => u.HexString.fromBase64(ret as string).toLittleEndian());
}

export async function getUsdlScriptHash(scriptHash: string) {
  return genericReadCall(scriptHash, 'getUSDLScriptHash', [])
    .then((ret) => u.HexString.fromBase64(ret as string).toLittleEndian());
}

// Entry point for all write operations
async function createTransaction(
  contractHash: string,
  operation: string,
  params: sc.ContractParam[],
  account: wallet.Account,
) {
  const script = sc.createScript({
    scriptHash: contractHash,
    operation,
    args: params,
  });

  const currentHeight = await RPC_CLIENT.getBlockCount();
  const transaction = new tx.Transaction({
    signers: [
      {
        account: account.scriptHash,
        scopes: tx.WitnessScope.CalledByEntry,
      },
    ],
    validUntilBlock: currentHeight + 10,
    script,
  });
  logger.debug(`Transaction created: contractHash=${contractHash}, operation=${operation}, `
    + `params=${JSON.stringify(params)}, account=${account.address}`);
  return transaction;
}

export async function liquidate(
  nestHash: string,
  usdlHash: string,
  tokenHash: string,
  quantity: number,
  targetAddress: string,
  account: wallet.Account,
) {
  return createTransaction(
    usdlHash,
    'transfer',
    [
      sc.ContractParam.hash160(account.address),
      sc.ContractParam.hash160(nestHash),
      sc.ContractParam.integer(quantity * 100_000_000),
      sc.ContractParam.array(...[
        sc.ContractParam.string('ACTION_LIQUIDATE'),
        sc.ContractParam.hash160(targetAddress),
        sc.ContractParam.hash160(tokenHash),
      ]),
    ],
    account,
  );
}

export async function transfer(
  contractHash: string,
  quantity: number,
  toAddress: string,
  account: wallet.Account,
) {
  return createTransaction(
    contractHash,
    'transfer',
    [
      sc.ContractParam.hash160(account.address),
      sc.ContractParam.hash160(toAddress),
      sc.ContractParam.integer(quantity * 100_000_000),
      sc.ContractParam.array(...[]),
    ],
    account,
  );
}

export async function setOracleFee(
  contractHash: string,
  oracleFee: number,
  account: wallet.Account,
) {
  return createTransaction(
    contractHash,
    'setOracleFee',
    [sc.ContractParam.integer(oracleFee)],
    account,
  );
}

export async function genericSetHash(
  scriptHash: string,
  targetScriptHash: string,
  operation: string,
  account: wallet.Account,
) {
  return createTransaction(
    scriptHash,
    operation,
    [sc.ContractParam.hash160(targetScriptHash)],
    account,
  );
}

export async function checkNetworkFee(transaction: tx.Transaction) {
  const feePerByteInvokeResponse = await RPC_CLIENT.invokeFunction(
    CONST.NATIVE_CONTRACT_HASH.PolicyContract,
    'getFeePerByte',
  );

  if (feePerByteInvokeResponse.state !== 'HALT') {
    throw new Error('Unable to retrieve data to calculate network fee.');
  }
  const feePerByte = u.BigInteger.fromNumber(
    feePerByteInvokeResponse.stack[0].value as any as string,
  );
  // Account for witness size
  const transactionByteSize = transaction.serialize().length / 2 + 109;
  // Hardcoded. Running a witness is always the same cost for the basic account.
  const witnessProcessingFee = u.BigInteger.fromNumber(1000390);
  const networkFeeEstimate = feePerByte
    .mul(transactionByteSize)
    .add(witnessProcessingFee);
  // eslint-disable-next-line no-param-reassign
  transaction.networkFee = networkFeeEstimate;
  logger.debug(`Network Fee set: ${transaction.networkFee.toDecimal(8)}`);
}

export async function checkSystemFee(transaction: tx.Transaction) {
  const invokeFunctionResponse = await RPC_CLIENT.invokeScript(
    u.HexString.fromHex(transaction.script),
    transaction.signers,
  );
  if (invokeFunctionResponse.state !== 'HALT') {
    throw new Error(
      `Transfer script errored out: ${invokeFunctionResponse.exception}`,
    );
  }
  const requiredSystemFee = u.BigInteger.fromNumber(
    invokeFunctionResponse.gasconsumed,
  );
  // eslint-disable-next-line no-param-reassign
  transaction.systemFee = requiredSystemFee;
  logger.debug(`System Fee set: ${transaction.systemFee.toDecimal(8)}`);
}

export async function performTransfer(transaction: tx.Transaction, account: wallet.Account) {
  const signedTransaction = transaction.sign(
    account,
    NETWORK_MAGIC,
  );

  const result = await RPC_CLIENT.sendRawTransaction(
    u.HexString.fromHex(signedTransaction.serialize(true)),
  );
  logger.info(`Transaction hash: ${result}`);
  return result;
}

export function base64MatchesAddress(base64Hash: string, address: string) {
  const fromBase64 = u.HexString.fromBase64(base64Hash, true).toString();
  const fromAddress = wallet.getScriptHashFromAddress(address);
  return fromBase64 === fromAddress;
}

// eslint-disable-next-line import/no-self-import
export * as DapiUtils from './dapiUtils';
