import React, { useState } from 'react';
import styled from 'styled-components/macro';
import tokenData from '../../../constants/cryptoCurrencies';
import CustomDivider from '../../shared/CustomDivider';
import { CryptoContainer, FlexContainer } from '../../shared/FlexContainer';
import Label from '../../shared/Label';
import Search from '../../shared/Search';

const SelectPoolModal = ({ pools, onSelect }) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <Content>
      <Search fluid placeholder="Search" value={searchValue} onChange={(e, { value }) => setSearchValue(value)} />

      <Label fontSize={13} fontFamily="syncopate">
        Pools
      </Label>
      <CustomDivider style={{ margin: '16px 0' }} />
      <FlexContainer className="column" gap={16}>
        {pools
          .filter((pool) => `${pool.token0}/${pool.token1}`?.toLowerCase()?.includes(searchValue?.replaceAll(' ', '')?.toLowerCase()))
          .map((pool, i) => (
            <div key={i} className="pointer flex align-ce" onClick={() => onSelect(pool)}>
              <CryptoContainer size={22} style={{ zIndex: 2 }}>
                {tokenData[pool.token0].icon}
              </CryptoContainer>
              <CryptoContainer size={22} style={{ marginLeft: -12, zIndex: 1 }}>
                {tokenData[pool.token1].icon}{' '}
              </CryptoContainer>
              <Label fontSize={13}>
                {pool.token0}/{pool.token1}
              </Label>
            </div>
          ))}
      </FlexContainer>
    </Content>
  );
};

export default SelectPoolModal;

const Content = styled.div`
  display: flex;
  flex-flow: column;
  .close-icon {
    path {
      fill: ${({ theme: { colors } }) => colors.white};
    }
  }

  input::placeholder {
    color: ${({ theme: { colors } }) => colors.white} !important;
  }
`;
