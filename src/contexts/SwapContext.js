import React, { createContext } from 'react';
import Pact from 'pact-lang-api';
import tokenData from '../constants/cryptoCurrencies';
import { reduceBalance } from '../utils/reduceBalance';

import { useKaddexWalletContext, useWalletContext, useAccountContext, usePactContext, useWalletConnectContext } from '.';
import {
  CHAIN_ID,
  creationTime,
  NETWORK,
  NETWORKID,
  KADDEX_NAMESPACE,
  NETWORK_VERSION
} from '../constants/contextConstants';
import { getPair, getPairAccount, getTokenBalanceAccount } from '../api/pact';
import { mkReq, parseRes } from '../api/utils';

export const SwapContext = createContext();

export const SwapProvider = (props) => {
  const pact = usePactContext();
  const { account, localRes, setLocalRes } = useAccountContext();
  const { isConnected: isKaddexWalletConnected, requestSign: kaddexWalletRequestSign } = useKaddexWalletContext();
  const { pairingTopic: isWalletConnectConnected, requestSignTransaction: walletConnectRequestSignTransaction } = useWalletConnectContext();
  const wallet = useWalletContext();

  const swap = async (token0, token1, isSwapIn) => {
    try {
      let pair = await getPairAccount(token0.address, token1.address);
      const inPactCode = `(${KADDEX_NAMESPACE}.exchange.swap-exact-in
          (read-decimal 'token0Amount)
          (read-decimal 'token1AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const outPactCode = `(${KADDEX_NAMESPACE}.exchange.swap-exact-out
          (read-decimal 'token1Amount)
          (read-decimal 'token0AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const cmd = {
        pactCode: isSwapIn ? inPactCode : outPactCode,
        keyPairs: {
          publicKey: account.guard.keys[0],
          secretKey: wallet.privKey,
          clist: [
            {
              name: `${token0.address}.TRANSFER`,
              args: [
                account.account,
                pair,
                isSwapIn
                  ? reduceBalance(token0.amount, tokenData[token0.coin].precision)
                  : reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), tokenData[token0.coin].precision),
              ],
            },
          ],
        },
        envData: {
          'user-ks': account.guard,
          token0Amount: reduceBalance(token0.amount, tokenData[token0.coin].precision),
          token1Amount: reduceBalance(token1.amount, tokenData[token1.coin].precision),
          token1AmountWithSlippage: reduceBalance(token1.amount * (1 - parseFloat(pact.slippage)), tokenData[token1.coin].precision),
          token0AmountWithSlippage: reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), tokenData[token0.coin].precision),
        },
        // meta: Pact.lang.mkMeta('', '', 0, 0, 0, 0),
        networkId: NETWORKID,
        meta: Pact.lang.mkMeta(
          account.account,
          CHAIN_ID,
          Number(pact.gasConfiguration.gasLimit),
          parseFloat(pact.gasConfiguration.gasPrice),
          creationTime(),
          600
        ),
      };
      pact.setPactCmd(cmd);
      await Pact.fetch.send(cmd, NETWORK);
    } catch (e) {
      console.log(e);
    }
  };

  const swapWallet = async (token0, token1, isSwapIn) => {
    const accountDetails = await getTokenBalanceAccount(token0.address, account.account);
    if (accountDetails.result.status === 'success') {
      const pair = await getPair(token0.address, token1.address);
      try {
        const inPactCode = `(${KADDEX_NAMESPACE}.exchange.swap-exact-in
          (read-decimal 'token0Amount)
          (read-decimal 'token1AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
        const outPactCode = `(${KADDEX_NAMESPACE}.exchange.swap-exact-out
          (read-decimal 'token1Amount)
          (read-decimal 'token0AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
        const signCmd = {
          pactCode: isSwapIn ? inPactCode : outPactCode,
          caps: [
            ...(pact.enableGasStation
              ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
              : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
            Pact.lang.mkCap('transfer capability', 'trasnsfer token in', `${token0.address}.TRANSFER`, [
              account.account,
              pair.account,
              isSwapIn
                ? reduceBalance(token0.amount, tokenData[token0.coin].precision)
                : reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), tokenData[token0.coin].precision),
            ]),
          ],
          sender: pact.enableGasStation ? 'kaddex-free-gas' : account.account,
          gasLimit: Number(pact.gasConfiguration.gasLimit),
          gasPrice: parseFloat(pact.gasConfiguration.gasPrice),
          chainId: CHAIN_ID,
          ttl: 600,
          envData: {
            'user-ks': accountDetails.result.data.guard,
            token0Amount: reduceBalance(token0.amount, tokenData[token0.coin].precision),
            token1Amount: reduceBalance(token1.amount, tokenData[token1.coin].precision),
            token0AmountWithSlippage: reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), tokenData[token0.coin].precision),
            token1AmountWithSlippage: reduceBalance(token1.amount * (1 - parseFloat(pact.slippage)), tokenData[token1.coin].precision),
          },
          signingPubKey: accountDetails.result.data.guard.keys[0],
          networkId: NETWORKID,
          networkVersion: NETWORK_VERSION,
        };
        //alert to sign tx
        /* walletLoading(); */
        wallet.setIsWaitingForWalletAuth(true);
        let command = null;
        if (isKaddexWalletConnected) {
          const res = await kaddexWalletRequestSign(signCmd);
          command = res.signedCmd;
        } else if (isWalletConnectConnected) {
          const res = await walletConnectRequestSignTransaction(account.account, CHAIN_ID, signCmd);
          command = res.signedCmd;
        } else {
          command = await Pact.wallet.sign(signCmd);
        }
        //close alert programmatically
        /* swal.close(); */
        wallet.setIsWaitingForWalletAuth(false);
        wallet.setWalletSuccess(true);
        //set signedtx
        pact.setPactCmd(command);
        let data = await fetch(`${NETWORK}/api/v1/local`, mkReq(command));
        data = await parseRes(data);
        setLocalRes(data);
        return data;
      } catch (e) {
        //wallet error alert
        /* setLocalRes({}); */
        if (e.message.includes('Failed to fetch'))
          wallet.setWalletError({
            error: true,
            title: 'No Wallet',
            content: 'Please make sure you open and login to your wallet.',
          });
        //walletError();
        else
          wallet.setWalletError({
            error: true,
            title: 'Wallet Signing Failure',
            content:
              'You cancelled the transaction or did not sign it correctly. Please make sure you sign with the keys of the account linked in Kaddex.',
          }); //walletSigError();
        console.log(e);
      }
    } else {
      wallet.setWalletError({
        error: true,
        title: 'Invalid Action',
        content: `You cannot perform this action with this account. Make sure you have the selected token on chain ${CHAIN_ID}`,
      }); //walletSigError();
    }
  };
  return (
    <SwapContext.Provider
      value={{
        swap,
        getPairAccount,
        swapWallet,
        tokenData,
        localRes,
        mkReq,
        parseRes,
      }}
    >
      {props.children}
    </SwapContext.Provider>
  );
};

export const SwapConsumer = SwapContext.Consumer;
