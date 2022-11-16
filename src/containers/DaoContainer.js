/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FlexContainer } from '../components/shared/FlexContainer';
import AllProposalsContainer from '../components/dao/AllProposalsContainer';
import SingleProposalContainer from '../components/dao/SingleProposalContainer';
import { useAccountContext } from '../contexts';
import { getAccountData } from '../api/dao';
import theme from '../styles/theme';
// import { useInterval } from '../hooks/useInterval';
import useWindowSize from '../hooks/useWindowSize';

const DaoContainer = () => {
  const { proposal_id } = useParams();
  const { account } = useAccountContext();

  const [accountData, setAccountData] = useState({});
  const [, height] = useWindowSize();

  const fetchData = async () => {
    const getAccountDataRes = await getAccountData(account.account);
    setAccountData(getAccountDataRes);
  };

  useEffect(() => {
    fetchData();
  }, [account]);

  // useInterval(fetchData, 30000);

  return (
    <FlexContainer
      className="column w-100 main"
      gap={16}
      desktopStyle={{
        paddingRight: theme.layout.desktopPadding,
        paddingLeft: theme.layout.desktopPadding,
        height: `calc(${height}px - ${theme.header.height}px)`,
      }}
      tabletStyle={{ paddingRight: theme.layout.tabletPadding, paddingLeft: theme.layout.tabletPadding }}
      mobileStyle={{ paddingRight: theme.layout.mobilePadding, paddingLeft: theme.layout.mobilePadding }}
    >
      {proposal_id ? (
        <SingleProposalContainer proposal_id={proposal_id} accountData={accountData} />
      ) : (
        <AllProposalsContainer accountData={accountData} />
      )}
    </FlexContainer>
  );
};

export default DaoContainer;
