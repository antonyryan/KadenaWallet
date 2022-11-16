import React from 'react';
import styled from 'styled-components/macro';
import { getDecimalPlaces, reduceBalance } from '../../utils/reduceBalance';
import Label from '../shared/Label';
import { useLiquidityContext, usePactContext } from '../../contexts';
import { commonColors } from '../../styles/theme';

const ResultContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 16px 0px;
  flex-flow: column;
  width: 100%;
  @media (max-width: ${({ theme: { mediaQueries } }) => `${mediaQueries.mobilePixel + 1}px`}) {
    flex-flow: column;
  }
  & > *:not(:last-child) {
    margin-bottom: 12px;
  }
`;

const RowContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-flow: row;
`;

const SwapResults = ({ priceImpact, fromValues, toValues }) => {
  const pact = usePactContext();
  const liquidity = useLiquidityContext();

  const getPriceImpactColor = () => {
    if (pact.priceImpactWithoutFee(priceImpact)) {
      const priceImpactPercentage = reduceBalance(pact.priceImpactWithoutFee(priceImpact) * 100, 4);
      if (priceImpactPercentage < 1) {
        return commonColors.green;
      } else if (priceImpactPercentage >= 1 && priceImpactPercentage < 5) {
        return commonColors.yellow;
      } else if (priceImpactPercentage >= 5) {
        return commonColors.red;
      }
    }
  };

  return (
    <ResultContainer>
      {pact.enableGasStation && (
        <RowContainer>
          <Label fontSize={13} color={commonColors.green}>
            Gas Cost
          </Label>
          <Label fontSize={13} color={commonColors.green} geColor="green" labelStyle={{ marginLeft: 5 }}>
            FREE
          </Label>
        </RowContainer>
      )}
      <RowContainer>
        <Label fontSize={13} color={getPriceImpactColor()}>
          Price Impact
        </Label>
        <Label fontSize={13} labelStyle={{ textAlign: 'end' }} color={getPriceImpactColor()}>
          {pact.priceImpactWithoutFee(priceImpact) < 0.0001 && pact.priceImpactWithoutFee(priceImpact)
            ? '< 0.01 %'
            : `${reduceBalance(pact.priceImpactWithoutFee(priceImpact) * 100, 4)} %`}
        </Label>
      </RowContainer>
      <RowContainer>
        <Label fontSize={13}>Price</Label>
        <Label fontSize={13} labelStyle={{ textAlign: 'end' }}>
          {reduceBalance(pact.ratio * (1 + priceImpact))} {fromValues.coin}/{toValues.coin}
        </Label>
      </RowContainer>
      <RowContainer>
        <Label fontSize={13}>Max Slippage</Label>
        <Label fontSize={13} labelStyle={{ textAlign: 'end' }}>
          {pact.slippage * 100} %
        </Label>
      </RowContainer>
      <RowContainer>
        <Label fontSize={13}>Liquidity Provider Fee</Label>
        <Label fontSize={13} labelStyle={{ textAlign: 'end' }}>
          {getDecimalPlaces(liquidity.liquidityProviderFee * parseFloat(fromValues.amount))} {fromValues.coin}
        </Label>
      </RowContainer>
    </ResultContainer>
  );
};

export default SwapResults;
