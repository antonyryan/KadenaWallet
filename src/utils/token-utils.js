import moment from 'moment';
import { getCoingeckoUsdPrice } from '../api/coingecko';
import { getTotalKDAVolume } from '../api/kaddex-stats';
import { CHAIN_ID, APR_FEE, STAKING_REWARDS_PERCENT } from '../constants/contextConstants';
import tokenData from '../constants/cryptoCurrencies';
import { bigNumberConverter } from './bignumber';
import { reduceBalance } from './reduceBalance';

export const getTokenByModuleV2 = (token) => {
  const tokenCode = token.refName.namespace ? `${token.refName.namespace}.${token.refName.name}` : `${token.refName.name}`;
  const token0 = Object.values(tokenData).find((t) => t.code === tokenCode);
  if (token0?.name) {
    return token0?.name?.toUpperCase();
  }
  return token0?.toUpperCase();
};
export const getTokenName = (code) => {
  const token0 = Object.values(tokenData).find((t) => t.code === code);
  if (token0?.name) {
    return token0?.name?.toUpperCase();
  }
  return code?.toUpperCase();
};

export const getTokenIconById = (token) => {
  return tokenData[token]?.icon;
};
export const getTokenIconByCode = (tokenCode) => {
  return tokenData[getTokenName(tokenCode)]?.icon;
};

export const getInfoCoin = (item, coinPositionArray) => {
  let cryptoCode = item?.params[coinPositionArray]?.refName?.namespace
    ? `${item?.params[coinPositionArray]?.refName?.namespace}.${item?.params[coinPositionArray]?.refName?.name}`
    : item?.params[coinPositionArray]?.refName?.name;
  const crypto = Object.values(tokenData).find(({ code }) => code === cryptoCode);
  return crypto;
};

export const getApr = (volume, liquidity) => {
  const percentageOnVolume = volume * APR_FEE;
  const percentagePerYear = percentageOnVolume * 365;
  const apr = liquidity ? (percentagePerYear * 100) / liquidity : 0;

  return apr;
};

export const getDailyUSDRewards = (totalDailyVolumeUSD) => (totalDailyVolumeUSD * STAKING_REWARDS_PERCENT) / 100;

export const getStakingApr = (totalDailyVolumeUSD, totalUsdStakedKDX) => {
  if (isNaN(totalDailyVolumeUSD) || isNaN(totalUsdStakedKDX)) {
    return null;
  }
  const dailyRewards = getDailyUSDRewards(totalDailyVolumeUSD);
  const yearlyRewards = dailyRewards * 365;
  return (100 * yearlyRewards) / totalUsdStakedKDX;
};

// calculate liquidity, volumes and apr for each pool
export const getAllPairValues = async (pools, volumes) => {
  const result = [];

  for (const pool of pools) {
    const token0 = Object.values(tokenData).find((t) => t.name === pool.token0);
    const token1 = Object.values(tokenData).find((t) => t.name === pool.token1);

    const liquidity0 = reduceBalance(pool.reserves[0]);
    const liquidity1 = reduceBalance(pool.reserves[1]);
    let liquidityUsd = 0;
    let volume24H = 0;
    let volume24HUsd = 0;
    let apr = 0;
    const liquidity = liquidity0 + liquidity1;

    // retrieve usd value for each token of the pair to calculate values in usd
    for (const token of [token0, token1]) {
      const tokenUsdPrice = await getTokenUsdPrice({ coingeckoId: 'kadena' }, pools);

      if (tokenUsdPrice) {
        volume24H = await getTotalKDAVolume(
          moment().subtract(1, 'days').toDate(),
          moment().subtract(1, 'days').toDate(),
          token.tokenNameKaddexStats,
          volumes
        );
        volume24HUsd = volume24H * tokenUsdPrice * 2;
        liquidityUsd += liquidity0 * tokenUsdPrice;
        apr = getApr(volume24HUsd, liquidityUsd);
      } else {
        apr = getApr(volume24H, liquidity);
        liquidityUsd = null;
      }
    }
    result.push({ ...pool, liquidityUsd, liquidity, volume24HUsd, volume24H, apr: { value: apr, token0: pool.token0, token1: pool.token1 } });
  }

  return result;
};

// convert liquidity in usd
export const getUsdTokenLiquidity = (liquidty, usdPrice) => {
  return usdPrice * liquidty;
};

export const isMatchingStatToken = (statNamespace, statName, code) => {
  const [namespace, name] = code.split('.');
  const isMatch = (namespace === statNamespace && name === statName) || (namespace === 'coin' && !name);
  return isMatch;
};

const getVolume = (volume, tokenNameKaddexStats) => {
  if (isMatchingStatToken(volume.tokenFromNamespace, volume.tokenFromName, tokenNameKaddexStats)) {
    return volume.tokenFromVolume;
  } else {
    return volume.tokenToVolume;
  }
};

export const get24HVolumeDoubleSided = (volumes, token0NameKaddexStats, token1NameKaddexStats, tokenNameKaddexStats) => {
  const last24hDailyVolume = volumes.slice(-1)[0];
  return last24hDailyVolume.volumes
    ?.filter(
      (v) =>
        v.chain === Number(CHAIN_ID) &&
        ((isMatchingStatToken(v.tokenFromNamespace, v.tokenFromName, token0NameKaddexStats) &&
          isMatchingStatToken(v.tokenToNamespace, v.tokenToName, token1NameKaddexStats)) ||
          (isMatchingStatToken(v.tokenFromNamespace, v.tokenFromName, token1NameKaddexStats) &&
            isMatchingStatToken(v.tokenToNamespace, v.tokenToName, token0NameKaddexStats)))
    )
    .reduce((total, v) => total + getVolume(v, tokenNameKaddexStats), 0);
};

export const get24HVolumeSingleSided = (volumes, tokenNameKaddexStats) => {
  const last24hDailyVolume = volumes?.slice(-1)[0];
  return last24hDailyVolume?.volumes
    ?.filter(
      (v) =>
        v.chain === Number(CHAIN_ID) &&
        (isMatchingStatToken(v.tokenFromNamespace, v.tokenFromName, tokenNameKaddexStats) ||
          isMatchingStatToken(v.tokenToNamespace, v.tokenToName, tokenNameKaddexStats))
    )
    .reduce((total, v) => total + getVolume(v, tokenNameKaddexStats), 0);
};

export const getTokenUsdPriceByLiquidity = (liquidity0, liquidity1, usdPrice, precision = 8) => {
  const liquidityRatio = liquidity0 / liquidity1;
  return bigNumberConverter(liquidityRatio * usdPrice, precision);
};

/**
 * @param {string} tokenName [example: "KDX"]
 */
export const getTokenUsdPriceByName = async (tokenName, pools) => {
  const token = Object.values(tokenData).find((t) => t.name === tokenName);
  return await getTokenUsdPrice(token, pools);
};

// retrieve token usd price based on the first pair that contains the token with a known price
export const getTokenUsdPrice = async (token, pairsList) => {
  if (!Array.isArray(pairsList)) {
    return null;
  }
  const filteredPairs = pairsList.filter((p) => p.token0 === token.name || p.token1 === token.name);

  let tokenUsd = await getCoingeckoUsdPrice(token.coingeckoId);
  if (tokenUsd) {
    return tokenUsd;
  } else {
    if (filteredPairs) {
      for (const pair of filteredPairs) {
        const liquidity0 = reduceBalance(pair.reserves[0]);
        const liquidity1 = reduceBalance(pair.reserves[1]);

        if (pair.token0 === token.name) {
          const token1 = Object.values(tokenData).find((t) => t.name === pair.token1);
          const token1Usd = await getCoingeckoUsdPrice(token1.coingeckoId);
          if (!token1Usd) {
            tokenUsd = null;
          } else {
            return getTokenUsdPriceByLiquidity(liquidity1, liquidity0, token1Usd, token.precision);
          }
        } else {
          const token0 = Object.values(tokenData).find((t) => t.name === pair.token0);
          const token0Usd = await getCoingeckoUsdPrice(token0.coingeckoId);
          if (!token0Usd) {
            tokenUsd = null;
          }
          return getTokenUsdPriceByLiquidity(liquidity0, liquidity1, token0Usd, token.precision);
        }

        return tokenUsd;
      }
    }
    return 0;
  }
};
