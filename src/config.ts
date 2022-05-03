import dotenv from 'dotenv';
import convict from 'convict';

dotenv.config();

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['prod', 'test'],
    default: 'dev',
    arg: 'nodeEnv',
    env: 'NODE_ENV',
    privateKey: process.env.PRIVATE_KEY,
  },
  privateKey: {
    format: String,
    default: '',
    arg: 'privateKey',
    env: 'PRIVATE_KEY',
  },
  rpcNodeUrl: {
    format: String,
    default: '',
    arg: 'rpcNodeUrl',
    env: 'RPC_NODE_URL',
  },
  wsNodeUrl: {
    format: String,
    default: '',
    arg: 'wsNodeUrl',
    env: 'WS_NODE_URL',
  },
  networkMagic: {
    format: Number,
    default: 0,
    arg: 'networkMagic',
    env: 'NETWORK_MAGIC',
  },
  nestScriptHash: {
    format: String,
    default: '',
    arg: 'nestScriptHash',
    env: 'NEST_SCRIPT_HASH',
  },
  bneoScriptHash: {
    format: String,
    default: '',
    arg: 'bneoScriptHash',
    env: 'BNEO_SCRIPT_HASH',
  },
  busdlScriptHash: {
    format: String,
    default: '',
    arg: 'busdlScriptHash',
    env: 'BUSDL_SCRIPT_HASH',
  },
  usdlScriptHash: {
    format: String,
    default: '',
    arg: 'usdlScriptHash',
    env: 'USDL_SCRIPT_HASH',
  },
  dryRun: {
    format: Boolean,
    default: true,
    arg: 'dryRun',
    env: 'DRY_RUN',
  },
});

const env = config.get('env');
config.loadFile(`./config/${env}.json`);
config.validate({ allowed: 'strict' }); // throws error if config does not conform to schema

// eslint-disable-next-line import/prefer-default-export
export { config };
