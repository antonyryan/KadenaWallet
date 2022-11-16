import Pact from 'pact-lang-api';
import { CHAIN_ID, KADDEX_NAMESPACE, NETWORK, NETWORKID } from '../constants/contextConstants';
import { getTokenBalanceAccount, pactFetchLocal } from './pact';
import { mkReq, parseRes, handleError, listen } from './utils';

export const getAccountData = async (account) => {
  try {
    const pactCode = `(${KADDEX_NAMESPACE}.dao.get-account-data "${account}")`;
    return await pactFetchLocal(pactCode);
  } catch (e) {
    return handleError(e);
  }
};

export const hasAccountVoted = async (account, proposalId) => {
  try {
    const pactCode = `(${KADDEX_NAMESPACE}.dao.read-account-vote-proposal  "${account}" "${proposalId}")`;
    return await pactFetchLocal(pactCode);
  } catch (e) {
    return handleError(e);
  }
};

export const readAllProposals = async () => {
  try {
    const pactCode = `(${KADDEX_NAMESPACE}.dao.read-all-proposals)`;
    return await pactFetchLocal(pactCode);
  } catch (e) {
    return handleError(e);
  }
};

export const readSingleProposal = async (proposalId) => {
  try {
    const pactCode = `(${KADDEX_NAMESPACE}.dao.read-proposal "${proposalId}")`;
    return await pactFetchLocal(pactCode);
  } catch (e) {
    return handleError(e);
  }
};

export const voteCommandToSign = async (type, proposalId, verifiedAccount, gasStation, gasLimit, gasPrice) => {
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
  try {
    let pactCode = '';
    if (type === 'approved') pactCode = `(${KADDEX_NAMESPACE}.dao.approved-vote "${proposalId}" "${account.account}" )`;
    else pactCode = `(${KADDEX_NAMESPACE}.dao.refused-vote "${proposalId}" "${account.account}" )`;
    const cmdToSign = {
      pactCode,
      caps: [
        ...(gasStation
          ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
          : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')]),
        Pact.lang.mkCap('guard', 'account GUARD', `${KADDEX_NAMESPACE}.dao.ACCOUNT_GUARD`, [account.account]),
      ],
      sender: gasStation ? 'kaddex-free-gas' : account.account,
      gasLimit: Number(gasLimit),
      gasPrice: parseFloat(gasPrice),
      chainId: CHAIN_ID,
      ttl: 600,
      signingPubKey: account.guard.keys[0],
      networkId: NETWORKID,
    };
    return cmdToSign;
  } catch (e) {
    return handleError(e);
  }
};

export const votePreview = async (signedCommand) => {
  try {
    let data = await fetch(`${NETWORK}/api/v1/local`, mkReq(signedCommand));
    return parseRes(data);
  } catch (e) {
    return handleError(e);
  }
};

export const vote = async (signedCmd, notification) => {
  let data = null;
  if (signedCmd.pactCode) {
    data = await Pact.fetch.send(signedCmd, NETWORK);
  } else {
    data = await Pact.wallet.sendSigned(signedCmd, NETWORK);
  }
  if (notification) notification(data.requestKeys[0], 'Vote Pending');
  return { listen: await listen(data.requestKeys[0]), data };
};
