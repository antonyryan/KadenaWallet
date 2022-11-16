/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import { getGroupedTVL } from '../../api/kaddex-stats';
import { getPairList } from '../../api/pact';
import { chartTimeRanges, CHART_OPTIONS, DAILY_VOLUME_RANGE, MONTHLY_VOLUME_RANGE, WEEKLY_VOLUME_RANGE } from '../../constants/chartOptionsConstants';
import { usePactContext } from '../../contexts';
import { humanReadableNumber, extractDecimal, reduceBalance } from '../../utils/reduceBalance';
import TVLChart from '../charts/TVLChart';
import VolumeChart from '../charts/VolumeChart';
import AnalyticsSimpleWidget from '../shared/AnalyticsSimpleWidget';
import CustomDropdown from '../shared/CustomDropdown';
import { FlexContainer } from '../shared/FlexContainer';
import GraphicPercentage from '../shared/GraphicPercentage';
import ProgressBar from '../shared/ProgressBar';
import StackedBarChart from '../shared/StackedBarChart';
import AppLoader from '../shared/AppLoader';
import { isMainnet } from '../../constants/contextConstants';
import { samplePairsVolume, sampleTokensVolume } from './devnetSampleVolumes';
import Label from '../shared/Label';

const KDX_TOTAL_SUPPLY = 1000000000;

const Dex = ({ kdaPrice, kdxSupply, poolState }) => {
  const { tokensUsdPrice } = usePactContext();
  const [stakeDataRange, setStakeDataRange] = useState(DAILY_VOLUME_RANGE.value);
  const [volumeRange, setVolumeRange] = useState(DAILY_VOLUME_RANGE.value);

  const [loading, setLoading] = useState(true);
  const [localPairList, setLocalPairList] = useState([]);
  const [tvlDetails, setTVLDetails] = useState([]);
  const [pairsVolume, setPairsVolume] = useState([]);
  const [stakingDiff, setStakingDiff] = useState(null);

  const stakedKdx = extractDecimal((poolState && poolState['staked-kdx']) || 0);

  useEffect(() => {
    getPairList().then((pL) => {
      setLocalPairList(pL);
    });
  }, []);

  const getTVLDetails = async () => {
    if (localPairList?.length) {
      const totalKDATVL = localPairList.reduce((partialSum, curr) => partialSum + reduceBalance(curr.reserves[0]), 0);

      const kdaPrice = tokensUsdPrice?.KDA;
      const pairData = localPairList
        .map((t) => {
          const kdaTVL = reduceBalance(t.reserves[0]);
          return {
            color: t.color,
            name: `${t.token0}/${t.token1}`,
            kdaReserve: t.reserves[0],
            volumeUsd: kdaPrice * reduceBalance(t.reserves[0]) * 2,
            percentage: (kdaTVL * 100) / totalKDATVL,
          };
        })
        .sort((x, y) => y.percentage - x.percentage);

      const mains = pairData.splice(0, 3);

      const totalKDAOtherTVL = pairData.reduce((partialSum, curr) => partialSum + reduceBalance(curr.kdaReserve), 0);

      const otherTokens = {
        name: 'OTHER',
        volumeUsd: kdaPrice * totalKDAOtherTVL,
        percentage: (totalKDAOtherTVL * 100) / totalKDATVL,
      };

      setTVLDetails([...mains, otherTokens]);
    }
    setLoading(false);
  };

  const getPairsVolume = async () => {
    axios
      .get(
        `${process.env.REACT_APP_KADDEX_STATS_API_URL}/volume/daily?dateStart=${chartTimeRanges[volumeRange].dateStartTvl}&dateEnd=${moment()
          .subtract(1, 'days')
          .format('YYYY-MM-DD')}`
      )
      .then(async (volumeRes) => {
        console.log('LOG --> volumeRes', volumeRes);
        const kdaPrice = tokensUsdPrice?.KDA;
        let mainVolumes = [];
        const otherVolumes = {
          name: 'OTHER',
          volumeKDA: 0,
        };
        const main = localPairList.filter((t) => t.main);
        const findMainPair = (vol) =>
          main.find(
            (m) => m.name === `coin:${vol.tokenFromNamespace}.${vol.tokenFromName}` || m.name === `coin:${vol.tokenToNamespace}.${vol.tokenToName}`
          );

        for (const volumes of volumeRes?.data) {
          for (const volume of volumes?.volumes) {
            const isMainPair = findMainPair(volume);
            if (isMainPair) {
              const alreadyAdded = mainVolumes.find((mV) => mV.name === `${isMainPair.token0}/${isMainPair.token1}`);
              if (alreadyAdded) {
                const volumeKDA = alreadyAdded.volumeKDA + (volume.tokenFromName === 'coin' ? volume.tokenFromVolume : volume.tokenToVolume);
                mainVolumes = [
                  ...mainVolumes.filter((mV) => mV.name !== `${isMainPair.token0}/${isMainPair.token1}`),
                  {
                    color: isMainPair.color,
                    name: `${isMainPair.token0}/${isMainPair.token1}`,
                    volumeKDA,
                  },
                ];
              } else {
                const volumeKDA = volume.tokenFromName === 'coin' ? volume.tokenFromVolume : volume.tokenToVolume;
                mainVolumes.push({
                  color: isMainPair.color,
                  name: `${isMainPair.token0}/${isMainPair.token1}`,
                  volumeKDA,
                });
              }
            } else {
              const volumeKDA = volume.tokenFromName === 'coin' ? volume.tokenFromVolume : volume.tokenToVolume;
              otherVolumes.volumeKDA += volumeKDA;
            }
          }
        }
        const mainVolumeBarData = [...mainVolumes]
          .map((volData) => ({
            ...volData,
            volumeUsd: volData.volumeKDA * kdaPrice,
            percentage: 10,
          }))
          .sort((x, y) => y.volumeUsd - x.volumeUsd);
        const otherVolumeBarData = [otherVolumes].map((volData) => ({
          ...volData,
          volumeUsd: volData.volumeKDA * kdaPrice,
          percentage: 10,
        }));
        const totVolumeBarData = [...mainVolumeBarData, ...otherVolumeBarData];
        const totalVol = totVolumeBarData.reduce((partialSum, curr) => partialSum + curr.volumeUsd, 0);
        setPairsVolume(totVolumeBarData.map((v) => ({ ...v, percentage: (100 * v.volumeUsd) / totalVol })));
        setLoading(false);
      })
      .catch((err) => {
        console.error('get volume error', err);
        setLoading(false);
      });
  };

  const getStakingData = async () => {
    let startDate = moment().subtract(2, 'days').format('YYYY-MM-DD');
    if (stakeDataRange === WEEKLY_VOLUME_RANGE.value) {
      startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
    }
    if (stakeDataRange === MONTHLY_VOLUME_RANGE.value) {
      startDate = moment().subtract(1, 'months').format('YYYY-MM-DD');
    }
    getGroupedTVL(startDate, moment().subtract(1, 'days').format('YYYY-MM-DD'))
      .then(async ({ data }) => {
        if (data?.length) {
          const lastStakingTVL = data[data.length - 1]?.tvl?.find((tvl) => tvl?.tokenFrom === 'kaddex.staking-pool-state');
          const firstTVL = data
            .find((allTvl) => allTvl?.tvl?.find((tvl) => tvl?.tokenFrom === 'kaddex.staking-pool-state'))
            ?.tvl?.find((tvl) => tvl?.tokenFrom === 'kaddex.staking-pool-state');

          if (lastStakingTVL?.tokenFromTVL && firstTVL?.tokenFromTVL) {
            setStakingDiff({
              initial: firstTVL?.tokenFromTVL,
              final: lastStakingTVL?.tokenFromTVL,
            });
          }
        }
      })
      .catch((err) => console.log('get tvl error', err));
  };

  useEffect(() => {
    if (tokensUsdPrice) {
      getTVLDetails();
      getPairsVolume();
    }
  }, [tokensUsdPrice, volumeRange, localPairList]);

  useEffect(() => {
    if (stakeDataRange) {
      getStakingData();
    }
  }, [stakeDataRange]);

  return loading ? (
    <AppLoader containerStyle={{ height: '100%', alignItems: 'center', justifyContent: 'center' }} />
  ) : (
    <FlexContainer className="w-100 column" mobileClassName="column" gap={24} style={{ paddingBottom: 32 }}>
      <FlexContainer className="w-100" mobileClassName="column" tabletClassName="column" gap={24}>
        <TVLChart kdaPrice={kdaPrice} height={300} />

        <VolumeChart kdaPrice={kdaPrice} height={300} />
      </FlexContainer>
      <FlexContainer mobileClassName="column" gap={24}>
        <AnalyticsSimpleWidget
          title={'KDX Staked'}
          mainText={
            (
              <div>
                {humanReadableNumber(stakedKdx, 2)} KDX
                <Label fontSize={16} mobileFontSize={16} labelStyle={{ opacity: 0.7, marginBottom: 3 }}>
                  $ {humanReadableNumber(tokensUsdPrice?.KDX * extractDecimal(stakedKdx))}
                </Label>
              </div>
            ) || '-'
          }
          subtitle={`${((100 * stakedKdx) / kdxSupply).toFixed(2)} %`}
        />
        <AnalyticsSimpleWidget
          title={'Staking Data'}
          mainText={<GraphicPercentage prevValue={stakingDiff?.initial} currentValue={stakingDiff?.final} />}
          subtitle={
            <div className="w-100 flex" style={{ paddingTop: 10 }}>
              <ProgressBar maxValue={KDX_TOTAL_SUPPLY} currentValue={stakedKdx} containerStyle={{ paddingTop: 2, width: '100%' }} />
              <span style={{ marginLeft: 20, whiteSpace: 'nowrap' }}>{((100 * stakedKdx) / KDX_TOTAL_SUPPLY).toFixed(3)} %</span>
            </div>
          }
          rightComponent={
            <CustomDropdown
              options={CHART_OPTIONS}
              dropdownStyle={{ minWidth: '66px', padding: 10, height: 30 }}
              onChange={(e, { value }) => {
                setStakeDataRange(value);
              }}
              value={stakeDataRange}
            />
          }
        />
      </FlexContainer>
      <FlexContainer>
        <StackedBarChart title="TVL Details" withDoubleToken data={isMainnet() ? tvlDetails : sampleTokensVolume} />
      </FlexContainer>
      <FlexContainer>
        <StackedBarChart
          title="Volume Details"
          data={isMainnet() ? pairsVolume : samplePairsVolume}
          withDoubleToken
          rightComponent={
            <CustomDropdown
              options={CHART_OPTIONS}
              dropdownStyle={{ minWidth: '66px', padding: 10, height: 30 }}
              onChange={(e, { value }) => {
                setVolumeRange(value);
              }}
              value={volumeRange}
            />
          }
        />
      </FlexContainer>
    </FlexContainer>
  );
};

export default Dex;
