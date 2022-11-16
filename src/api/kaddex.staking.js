import moment from 'moment';
import Pact from 'pact-lang-api';
import { getTokenBalanceAccount, pactFetchLocal } from './pact';
import { getFloatPrecision } from '../utils/string-utils';
import { CHAIN_ID, GAS_PRICE, GAS_LIMIT, NETWORKID, ENABLE_GAS_STATION, KADDEX_NAMESPACE } from '../constants/contextConstants';
import { handleError } from './utils';
import { reduceBalance } from '../utils/reduceBalance';
import tokenData from '../constants/cryptoCurrencies';

export const getPoolState = async () => {
  try {
    const stakingPoolStateData = await pactFetchLocal(`(${KADDEX_NAMESPACE}.staking.get-pool-state)`);
    return stakingPoolStateData;
  } catch (e) {
    return handleError(e);
  }
};

export const estimateUnstake = async (account) => {
  try {
    const stakingPoolStateData = await pactFetchLocal(`(${KADDEX_NAMESPACE}.staking.inspect-staker "${account}")`);
    return stakingPoolStateData;
  } catch (e) {
    return handleError(e);
  }
};

export const getAddStakeCommand = async (verifiedAccount, amountToStake, gasStation, gasLimit, gasPrice) => {
  let account = null;
  if (verifiedAccount.guard) {
    account = verifiedAccount;
  } else {
    const accountDetails = await getTokenBalanceAccount(`${KADDEX_NAMESPACE}.kdx`, verifiedAccount.account);
    if (accountDetails.result.status === 'success') {
      account = accountDetails.result.data;
    } else {
      return null;
    }
  }
  const parsedAmount = parseFloat(amountToStake?.toString());
  let decimalPlaces = getFloatPrecision(parsedAmount);
  if (decimalPlaces > tokenData['KDX'].precision) {
    decimalPlaces = tokenData['KDX'].precision;
  }
  const pactCode = `(${KADDEX_NAMESPACE}.staking.stake "${account.account}" ${parsedAmount.toFixed(decimalPlaces || 2)})`;
  return {
    pactCode,
    caps: [
      ...(gasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('wrap capability', 'wrapping skdx', `${KADDEX_NAMESPACE}.kdx.WRAP`, [
        'kaddex.skdx',
        account.account,
        account.account,
        parsedAmount,
      ]),
      Pact.lang.mkCap('stake capability', 'staking', `${KADDEX_NAMESPACE}.staking.STAKE`, [account.account, parsedAmount]),
    ],
    sender: gasStation ? 'kaddex-free-gas' : account.account,
    gasLimit: Number(gasLimit),
    gasPrice: parseFloat(gasPrice),
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': account.guard,
    },
    signingPubKey: account.guard.keys[0],
    networkId: NETWORKID,
  };
};
//NOT USED
export const geUnstakeCommand = (verifiedAccount, amountToUnstake) => {
  const parsedAmount = parseFloat(amountToUnstake?.toString());
  const decimalPlaces = getFloatPrecision(parsedAmount);
  const pactCode = `(${KADDEX_NAMESPACE}.staking.unstake "${verifiedAccount.account}" ${parsedAmount.toFixed(decimalPlaces || 2)})`;
  return {
    pactCode,
    caps: [
      ...(ENABLE_GAS_STATION
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('unwrap capability for rewards', 'unwrapping skdx for user', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        verifiedAccount.account,
        verifiedAccount.account,
        amountToUnstake,
      ]),
      Pact.lang.mkCap('unwrap capability for penalty', 'unwrapping skdx for penalty', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        verifiedAccount.account,
        'kdx-staking',
        amountToUnstake,
      ]),
      Pact.lang.mkCap('unstake capability', 'unstaking', `${KADDEX_NAMESPACE}.staking.UNSTAKE`, [verifiedAccount.account]),
    ],
    sender: ENABLE_GAS_STATION ? 'kaddex-free-gas' : verifiedAccount.account,
    gasLimit: GAS_LIMIT,
    gasPrice: GAS_PRICE,
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': verifiedAccount.guard,
    },
    signingPubKey: verifiedAccount.guard.keys[0],
    networkId: NETWORKID,
  };
};
//NOT USED
export const getRollupRewardsCommand = (verifiedAccount) => {
  const pactCode = `(${KADDEX_NAMESPACE}.staking.rollup "${verifiedAccount.account}")`;
  return {
    pactCode,
    caps: [
      ...(ENABLE_GAS_STATION
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('rollup capability', 'rollup', `${KADDEX_NAMESPACE}.staking.ROLLUP`, [verifiedAccount.account]),
    ],
    sender: ENABLE_GAS_STATION ? 'kaddex-free-gas' : verifiedAccount.account,
    gasLimit: GAS_LIMIT,
    gasPrice: GAS_PRICE,
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': verifiedAccount.guard,
    },
    signingPubKey: verifiedAccount.guard.keys[0],
    networkId: NETWORKID,
  };
};

export const getRollupAndUnstakeCommand = async (verifiedAccount, amountToUnstake, gasStation, gasLimit, gasPrice) => {
  let account = null;
  if (verifiedAccount.guard) {
    account = verifiedAccount;
  } else {
    const accountDetails = await getTokenBalanceAccount(`${KADDEX_NAMESPACE}.kdx`, verifiedAccount.account);
    if (accountDetails.result.status === 'success') {
      account = accountDetails.result.data;
    } else {
      return null;
    }
  }
  const parsedAmount = parseFloat(amountToUnstake?.toString());
  let decimalPlaces = getFloatPrecision(parsedAmount);
  if (decimalPlaces > tokenData['KDX'].precision) {
    decimalPlaces = tokenData['KDX'].precision;
  }
  const pactCode = `
  (${KADDEX_NAMESPACE}.staking.rollup "${account.account}")
  (${KADDEX_NAMESPACE}.staking.unstake "${account.account}" ${parsedAmount.toFixed(decimalPlaces || 2)})
  `;
  return {
    pactCode,
    caps: [
      Pact.lang.mkCap('rollup capability', 'rollup', `${KADDEX_NAMESPACE}.staking.ROLLUP`, [account.account]),
      Pact.lang.mkCap('unwrap capability for rewards', 'unwrapping skdx for user', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        account.account,
        account.account,
        reduceBalance(parsedAmount.toFixed(decimalPlaces || 2), decimalPlaces || 2),
      ]),
      Pact.lang.mkCap('unwrap capability for penalty', 'unwrapping skdx for penalty', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        account.account,
        'kdx-staking',
        reduceBalance(parsedAmount.toFixed(decimalPlaces || 2), decimalPlaces || 2),
      ]),
      Pact.lang.mkCap('unstake capability', 'unstaking', `${KADDEX_NAMESPACE}.staking.UNSTAKE`, [account.account]),
      ...(gasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
    ],
    sender: gasStation ? 'kaddex-free-gas' : account.account,
    gasLimit: Number(gasLimit),
    gasPrice: parseFloat(gasPrice),
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': account.guard,
    },
    signingPubKey: account.guard.keys[0],
    networkId: NETWORKID,
  };
};

export const getRollupAndClaimCommand = async (verifiedAccount, gasStation, gasLimit, gasPrice) => {
  let account = null;
  if (verifiedAccount.guard) {
    account = verifiedAccount;
  } else {
    const accountDetails = await getTokenBalanceAccount(`${KADDEX_NAMESPACE}.kdx`, verifiedAccount.account);
    if (accountDetails.result.status === 'success') {
      account = accountDetails.result.data;
    } else {
      return null;
    }
  }
  const pactCode = `
  (${KADDEX_NAMESPACE}.staking.rollup "${account.account}")
  (${KADDEX_NAMESPACE}.staking.claim "${account.account}")
  `;
  return {
    pactCode,
    caps: [
      ...(gasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('rollup capability', 'rollup', `${KADDEX_NAMESPACE}.staking.ROLLUP`, [account.account]),
      Pact.lang.mkCap('claim capability', 'claim', `${KADDEX_NAMESPACE}.staking.CLAIM`, [account.account]),
    ],
    sender: gasStation ? 'kaddex-free-gas' : account.account,
    gasLimit: Number(gasLimit),
    gasPrice: parseFloat(gasPrice),
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': account.guard,
    },
    signingPubKey: account.guard.keys[0],
    networkId: NETWORKID,
  };
};
export const getRollupClaimAndUnstakeCommand = async (verifiedAccount, amountToUnstake, gasStation, gasLimit, gasPrice) => {
  let account = null;
  if (verifiedAccount.guard) {
    account = verifiedAccount;
  } else {
    const accountDetails = await getTokenBalanceAccount(`${KADDEX_NAMESPACE}.kdx`, verifiedAccount.account);
    if (accountDetails.result.status === 'success') {
      account = accountDetails.result.data;
    } else {
      return null;
    }
  }
  const parsedAmount = parseFloat(amountToUnstake?.toString());
  let decimalPlaces = getFloatPrecision(parsedAmount);
  if (decimalPlaces > tokenData['KDX'].precision) {
    decimalPlaces = tokenData['KDX'].precision;
  }
  const pactCode = `
  (${KADDEX_NAMESPACE}.staking.rollup "${account.account}")
  (${KADDEX_NAMESPACE}.staking.claim "${account.account}")
  (${KADDEX_NAMESPACE}.staking.unstake "${account.account}" ${parsedAmount.toFixed(decimalPlaces || 2)})
  `;
  return {
    pactCode,
    caps: [
      ...(gasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('rollup capability', 'rollup', `${KADDEX_NAMESPACE}.staking.ROLLUP`, [account.account]),
      Pact.lang.mkCap('claim capability', 'claim', `${KADDEX_NAMESPACE}.staking.CLAIM`, [account.account]),
      Pact.lang.mkCap('unwrap capability for rewards', 'unwrapping skdx for user', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        account.account,
        account.account,
        reduceBalance(parsedAmount.toFixed(decimalPlaces || 2), decimalPlaces || 2),
      ]),
      Pact.lang.mkCap('unwrap capability for penalty', 'unwrapping skdx for penalty', `${KADDEX_NAMESPACE}.kdx.UNWRAP`, [
        'kaddex.skdx',
        account.account,
        'kdx-staking',
        reduceBalance(parsedAmount.toFixed(decimalPlaces || 2), decimalPlaces || 2),
      ]),
      Pact.lang.mkCap('unstake capability', 'unstaking', `${KADDEX_NAMESPACE}.staking.UNSTAKE`, [account.account]),
    ],
    sender: gasStation ? 'kaddex-free-gas' : account.account,
    gasLimit: Number(gasLimit),
    gasPrice: parseFloat(gasPrice),
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': account.guard,
    },
    signingPubKey: account.guard.keys[0],
    networkId: NETWORKID,
  };
};
// NOT USED
export const getClaimRewardsCommand = (verifiedAccount) => {
  const pactCode = `(${KADDEX_NAMESPACE}.staking.claim "${verifiedAccount.account}")`;
  return {
    pactCode,
    caps: [
      ...(ENABLE_GAS_STATION
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
      Pact.lang.mkCap('claim capability', 'claim', `${KADDEX_NAMESPACE}.staking.CLAIM`, [verifiedAccount.account]),
    ],
    sender: ENABLE_GAS_STATION ? 'kaddex-free-gas' : verifiedAccount.account,
    gasLimit: GAS_LIMIT,
    gasPrice: GAS_PRICE,
    chainId: CHAIN_ID,
    ttl: 600,
    envData: {
      'user-ks': verifiedAccount.guard,
    },
    signingPubKey: verifiedAccount.guard.keys[0],
    networkId: NETWORKID,
  };
};

/**
 * To simulate the increase in the reward penalty period for a stake operation
 */
export const calculateNewStart = async (effectiveStartDate, alreadyStakedAmount, addedStakedAmount) => {
  try {
    const currentTime = moment().utc().format(); // "2020-01-02T00:00:00Z"
    const calcNewStartData = await pactFetchLocal(
      `(${KADDEX_NAMESPACE}.staking.calculate-new-start (time "${currentTime}") (time "${effectiveStartDate}") ${alreadyStakedAmount} ${addedStakedAmount})`
    );
    /**
     *  The returned value is the new effective start date, which is used in the reward penalty calculation;
     *  the penalty will last for kaddex.staking.MATURATION_PERIOD seconds after the effective start date.
     */
    return calcNewStartData;
  } catch (e) {
    if (process.env.REACT_APP_STAKING_SIMULATION) {
      return '2020-01-26T04:00:00Z';
    } else {
      return handleError(e);
    }
  }
};
