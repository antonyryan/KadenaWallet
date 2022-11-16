import React from 'react';
import CustomButton from '../../shared/CustomButton';
import { StakeModalRow } from './AddStakeModal';
import Label from '../../shared/Label';
import { usePactContext } from '../../../contexts';
import RowTokenInfoPrice from '../../shared/RowTokenInfoPrice';
import { getTokenIconByCode } from '../../../utils/token-utils';

export const ClaimModal = ({ onConfirm, estimateUnstakeData }) => {
  const { tokensUsdPrice } = usePactContext();

  return (
    <div>
      <Label fontSize={16}>Staking Rewards Collected</Label>
      <StakeModalRow style={{ marginBottom: 20 }}>
        <RowTokenInfoPrice
          tokenIcon={getTokenIconByCode('kaddex.kdx')}
          tokenName="KDX"
          amount={estimateUnstakeData['reward-accrued']}
          tokenPrice={tokensUsdPrice?.KDX}
        />
      </StakeModalRow>

      {estimateUnstakeData['reward-penalty'] ? (
        <>
          <Label fontSize={16}>
            Rewards Penalty
            <Label fontSize={16} labelStyle={{ opacity: 0.7, marginLeft: 8 }}>
              - {((100 * estimateUnstakeData['reward-penalty']) / estimateUnstakeData['reward-accrued']).toFixed(2)} %
            </Label>
          </Label>
          <StakeModalRow>
            <RowTokenInfoPrice
              tokenIcon={getTokenIconByCode('kaddex.kdx')}
              tokenName="KDX"
              amount={estimateUnstakeData['reward-penalty']}
              tokenPrice={tokensUsdPrice?.KDX}
            />
          </StakeModalRow>
        </>
      ) : null}
      <CustomButton type="gradient" buttonStyle={{ marginTop: 32 }} onClick={onConfirm}>
        WITHDRAW
      </CustomButton>
    </div>
  );
};
