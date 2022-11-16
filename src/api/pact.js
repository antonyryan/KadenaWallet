import Pact from 'pact-lang-api';
import { handleError } from './utils';
import pairTokens from '../constants/pairsConfig';
import { CHAIN_ID, creationTime, GAS_PRICE, KADDEX_NAMESPACE, NETWORKID } from '../constants/contextConstants';
import { NETWORK } from '../constants/contextConstants';
import tokenData from '../constants/cryptoCurrencies';
import { extractDecimal } from '../utils/reduceBalance';

export const pactFetchLocal = async (pactCode, options) => {
  let data = await Pact.fetch.local(
    {
      pactCode,
      meta: Pact.lang.mkMeta('', CHAIN_ID, GAS_PRICE, 150000, creationTime(), 600),
      ...options,
    },
    NETWORK
  );
  if (data.result.status === 'success') {
    return data.result.data;
  } else if (data.result.error.message) {
    const errorMessage = handleError(data);
    return { errorMessage: data.result.error.message || errorMessage };
  } else {
    return handleError(data);
  }
};

export const getCurrentKdaUSDPrice = async () => {
  try {
    let data = await Pact.fetch.local(
      {
        pactCode: `
        (${KADDEX_NAMESPACE}.public-sale.kda-current-usd-price)
        `,
        meta: Pact.lang.mkMeta('', '0', GAS_PRICE, 150000, creationTime(), 600),
        chainId: 0,
      },
      `https://api.chainweb.com/chainweb/0.0/${NETWORKID}/chain/0/pact`
    );
    return data.result?.status === 'success' ? data.result?.data : null;
  } catch (e) {
    console.log(e);
  }
};

export const getPair = async (token0, token1) => {
  try {
    let data = await Pact.fetch.local(
      {
        pactCode: `(${KADDEX_NAMESPACE}.exchange.get-pair ${token0} ${token1})`,
        keyPairs: Pact.crypto.genKeyPair(),
        meta: Pact.lang.mkMeta('', CHAIN_ID, GAS_PRICE, 150000, creationTime(), 600),
      },
      NETWORK
    );
    if (data.result.status === 'success') {
      return data.result.data;
    } else {
      return null;
    }
  } catch (e) {
    console.log(e);
  }
};

export const getPairList = async () => {
  try {
    const tokenPairList = Object.keys(pairTokens).reduce((accum, pair) => {
      accum += `[${pair.split(':').join(' ')}] `;
      return accum;
    }, '');

    let data = await pactFetchLocal(
      `
              (namespace 'free)
  
              (module ${KADDEX_NAMESPACE}-read G
  
                (defcap G ()
                  true)
  
                (defun pair-info (pairList:list)
                  (let* (
                    (token0 (at 0 pairList))
                    (token1 (at 1 pairList))
                    (p (${KADDEX_NAMESPACE}.exchange.get-pair token0 token1))
                    (reserveA (${KADDEX_NAMESPACE}.exchange.reserve-for p token0))
                    (reserveB (${KADDEX_NAMESPACE}.exchange.reserve-for p token1))
                    (totalBal (${KADDEX_NAMESPACE}.tokens.total-supply (${KADDEX_NAMESPACE}.exchange.get-pair-key token0 token1)))
                  )
                  [(${KADDEX_NAMESPACE}.exchange.get-pair-key token0 token1)
                   reserveA
                   reserveB
                   totalBal
                 ]
                ))
              )
              (map (${KADDEX_NAMESPACE}-read.pair-info) [${tokenPairList}])
               `
    );
    if (data.errorMessage) {
      return data;
    }
    if (data) {
      let dataList = data.reduce((accum, data) => {
        accum[data[0]] = {
          supply: data[3],
          reserves: [data[1], data[2]],
        };
        return accum;
      }, {});
      const pairList = Object.values(pairTokens).map((pair) => {
        return {
          ...pair,
          ...dataList[pair.name],
        };
      });
      return pairList;
    }
  } catch (e) {
    return handleError(e);
  }
};

export const getPairListAccountBalance = async (account) => {
  try {
    const tokenPairListWithBooster = Object.values(pairTokens)
      .filter((token) => token.isBoosted)
      .reduce((accum, pair) => {
        accum += `[${pair.name.split(':').join(' ')}] `;
        return accum;
      }, '');
    const tokenPairListWithoutBooster = Object.values(pairTokens)
      .filter((token) => !token.isBoosted)
      .reduce((accum, pair) => {
        accum += `[${pair.name.split(':').join(' ')}] `;
        return accum;
      }, '');

    const boosterResult = await dataWithBooster(account, tokenPairListWithBooster);

    const noBoosterResult = await dataWithoutBooster(account, tokenPairListWithoutBooster);

    const totalResult = boosterResult.concat(noBoosterResult);

    return totalResult;
  } catch (e) {
    return handleError(e);
  }
};

export const getOneSideLiquidityPairInfo = async (amountA, slippage, token0, token1) => {
  try {
    let data = await pactFetchLocal(
      `
    (namespace 'free)

    (module ${KADDEX_NAMESPACE}-read G

      (defcap G ()
        true)

      (defun pair-info ()
        (let* (
          (p (${KADDEX_NAMESPACE}.exchange.get-pair ${token0} ${token1}))
          (pair-account (at 'account p))
          (amountB (${KADDEX_NAMESPACE}.wrapper.get-other-side-token-amount-after-swap ${amountA} ${token0} ${token1} (+ 1.0 ${slippage})))
          (reserveA (${KADDEX_NAMESPACE}.exchange.reserve-for p ${token0}))
          (amountA-after-swap (- ${amountA} (${KADDEX_NAMESPACE}.wrapper.get-one-sided-liquidity-swap-amount reserveA ${amountA})))
          (amountA-min (${KADDEX_NAMESPACE}.exchange.truncate ${token0} (* amountA-after-swap (- 1.0 ${slippage}))))
          (amountB-min (${KADDEX_NAMESPACE}.exchange.truncate ${token1} (* (/ amountB (+ 1.0 ${slippage})) (- 1.0 ${slippage}))))
        )
        { 'account: pair-account, 'amountB: amountB, 'amountA-min: amountA-min, 'amountB-min: amountB-min }
      ))
    )
     (${KADDEX_NAMESPACE}-read.pair-info)
           `
    );
    if (data) {
      return data;
    } else {
      return handleError('');
    }
  } catch (e) {
    return handleError(e);
  }
};

const dataWithoutBooster = async (account, tokenPairList) => {
  let data = await pactFetchLocal(
    `
          (namespace 'free)

          (module ${KADDEX_NAMESPACE}-read G

            (defcap G ()
              true)

            (defun pair-info (pairList:list)
              (let* (
                (token0 (at 0 pairList))
                (token1 (at 1 pairList))
                (p (${KADDEX_NAMESPACE}.exchange.get-pair token0 token1))
                (reserveA (${KADDEX_NAMESPACE}.exchange.reserve-for p token0))
                (reserveB (${KADDEX_NAMESPACE}.exchange.reserve-for p token1))
                (totalBal (${KADDEX_NAMESPACE}.tokens.total-supply (${KADDEX_NAMESPACE}.exchange.get-pair-key token0 token1)))
                (acctBal
                    (try 0.0 (${KADDEX_NAMESPACE}.tokens.get-balance (${KADDEX_NAMESPACE}.exchange.get-pair-key token0 token1) ${JSON.stringify(
      account
    )})
                  ))
              )
              [(${KADDEX_NAMESPACE}.exchange.get-pair-key token0 token1)
               reserveA
               reserveB
               totalBal
               acctBal
               (* reserveA (/ acctBal totalBal))
               (* reserveB (/ acctBal totalBal))
             ]
            ))
          )
          (map (${KADDEX_NAMESPACE}-read.pair-info) [${tokenPairList}])
           `
  );

  if (data) {
    let dataList = data.reduce((accum, data) => {
      accum[data[0]] = {
        balance: data[4],
        supply: data[3],
        reserves: [data[1], data[2]],
        pooledAmount: [data[5], data[6]],
        poolShare: extractDecimal(data[4]) / extractDecimal(data[3]),
      };
      return accum;
    }, {});

    const pairList = Object.values(pairTokens)
      .filter((token) => !token.isBoosted)
      .map((pair) => {
        return {
          ...pair,
          ...dataList[pair.name],
        };
      });
    return pairList;
  }
};

const dataWithBooster = async (account, tokenPairList) => {
  let data = await pactFetchLocal(
    `(namespace 'free)

    (module ${KADDEX_NAMESPACE}-read G

      (defcap G ()
        true)

      (defun pair-info (pairList:list)
        (let* (
          (token0 (at 0 pairList))
          (token1 (at 1 pairList))
          (p (${KADDEX_NAMESPACE}.exchange.get-pair token0 token1))
          (reserveA (${KADDEX_NAMESPACE}.exchange.reserve-for p token0))
          (reserveB (${KADDEX_NAMESPACE}.exchange.reserve-for p token1))
          (result (try {
            "initialA": 0.0,
            "feesB": 0.0,
            "totalB": 0.0,
            "initialB": 0.0,
            "feesA": 0.0,
            "liquidity": 0.0,
            "user-pool-share": 0.0,
            "totalA": 0.0,
            "reserveA":0.0,
            "reserveB":0.0
            } (${KADDEX_NAMESPACE}.wrapper.get-user-position-stats token0 token1 ${JSON.stringify(account)})))
        )
        [{"initialA":(at 'initialA result),
        "feesB":(at 'feesB result),
        "totalB":(at 'totalB result),
        "initialB":(at 'initialB result),
        "feesA":(at 'feesA result),
        "liquidity":(at 'liquidity result),
        "user-pool-share":(at 'user-pool-share result),
        "totalA":(at 'totalA result),
        "reserveA":reserveA,
        "reserveB":reserveB}]
      ))
    )
    (map (${KADDEX_NAMESPACE}-read.pair-info) [${tokenPairList}])`
  );

  if (data) {
    const dataList = data.map((data) => {
      let dataObj = {
        balance: data[0]['liquidity'],
        pooledAmount: [data[0]['totalA'], data[0]['totalB']],
        poolShare: data[0]['user-pool-share'],
        reserves: [data[0]['reserveA'], data[0]['reserveB']],
      };

      return dataObj;
    });

    const pairList = Object.values(pairTokens)
      .filter((token) => token.isBoosted)
      .map((pair, index) => {
        return {
          ...pair,
          ...dataList[index],
        };
      });
    return pairList;
  }
};

export const getPairAccount = async (token0, token1) => {
  const result = await pactFetchLocal(`(at 'account (${KADDEX_NAMESPACE}.exchange.get-pair ${token0} ${token1}))`);
  if (result.errorMessage) {
    return result.errorMessage;
  } else {
    return result;
  }
};

export const getTokenBalanceAccount = async (coinCode, account) => {
  if (account) {
    return await Pact.fetch.local(
      {
        pactCode: `(${coinCode}.details ${JSON.stringify(account)})`,
        meta: Pact.lang.mkMeta('', CHAIN_ID, GAS_PRICE, 150000, creationTime(), 600),
      },
      NETWORK
    );
  } else {
    return { result: { status: 'failure' } };
  }
};

export const fetchPrecision = async () => {
  let endBracket = '';
  let tokenNames = Object.values(tokenData).reduce((accum, cumul) => {
    endBracket += ')';
    let code = `
    (let
      ((${cumul.name}
        (try -1 (${cumul.code}.precision))
    ))`;
    accum += code;
    return accum;
  }, '');
  let objFormat = `{${Object.keys(tokenData)
    .map((token) => `"${token}": ${token}`)
    .join(',')}}`;
  tokenNames = tokenNames + objFormat + endBracket;
  try {
    let data = await Pact.fetch.local(
      {
        pactCode: tokenNames,
        meta: Pact.lang.mkMeta('', CHAIN_ID, GAS_PRICE, 150000, creationTime(), 600),
      },
      NETWORK
    );
    if (data.result.status === 'success') {
      Object.keys(tokenData).forEach((token) => {
        tokenData[token].precision = extractDecimal(data.result.data[token]);
      });
    }
  } catch (e) {
    console.log(e);
  }
};
