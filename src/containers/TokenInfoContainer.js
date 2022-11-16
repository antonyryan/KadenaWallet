import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { useHistory, useParams } from 'react-router-dom';
import { usePactContext } from '../contexts';
import { ArrowBack } from '../assets';
import { getDailyCandles, getTotalVolume, getUSDPriceDiff, getKDAPriceDiff } from '../api/kaddex-stats';
import TokenPriceChart from '../components/charts/TokenPriceChart';
import AnalyticsSimpleWidget from '../components/shared/AnalyticsSimpleWidget';
import { CryptoContainer, FlexContainer } from '../components/shared/FlexContainer';
import GraphicPercentage from '../components/shared/GraphicPercentage';
import Label from '../components/shared/Label';
import tokenData from '../constants/cryptoCurrencies';
import { getDecimalPlaces, humanReadableNumber } from '../utils/reduceBalance';
import theme from '../styles/theme';

const initialMonthlyRange = {
  initial: 0,
  final: 0,
};

const TokenInfoContainer = () => {
  const history = useHistory();
  const { token } = useParams();
  const pact = usePactContext();

  const asset = (tokenData[token].statsID || tokenData[token].code) === 'coin' ? 'KDA' : tokenData[token].statsID || tokenData[token].code;
  const currency = (tokenData[token].statsID || tokenData[token].code) === 'coin' ? 'USDT' : 'coin';

  const [monthlyRange, setMonthlyRange] = useState(initialMonthlyRange);
  const [monthlyVolumeRange, setMonthlyVolumeRange] = useState(initialMonthlyRange);
  const [price24h, setPrice24h] = useState({
    initial: null,
    final: null,
  });

  useEffect(() => {
    const initData = async () => {
      const { data } = await getDailyCandles(asset, currency, moment().subtract(30, 'days').toDate());
      if (data) {
        const initial = data[0]?.usdPrice?.close || data[0]?.price?.close || 0;
        const final = data[data?.length - 1]?.usdPrice?.close || data[data?.length - 1]?.price?.close || 0;
        setMonthlyRange({
          initial,
          final,
        });
      }
      const lastMonthVolume = await getTotalVolume(
        moment().subtract(1, 'months').toDate(),
        new Date(),
        tokenData[token].statsID || tokenData[token].code
      );
      if (lastMonthVolume) {
        const pastLastMonthVolume = await getTotalVolume(
          moment().subtract(2, 'months').toDate(),
          moment().subtract(1, 'months').toDate(),
          tokenData[token].statsID || tokenData[token].code
        );
        if (pastLastMonthVolume) {
          setMonthlyVolumeRange({
            initial: pastLastMonthVolume,
            final: lastMonthVolume,
          });
        }
      }
      let price24Diff = null;
      if (asset === 'KDA') {
        price24Diff = await getKDAPriceDiff(moment().subtract(1, 'days').toDate(), new Date(), asset, currency);
      } else {
        price24Diff = await getUSDPriceDiff(moment().subtract(1, 'days').toDate(), new Date(), asset, currency);
      }
      setPrice24h(price24Diff);
    };
    initData();
  }, [asset, currency, token]);

  return (
    <FlexContainer
      className="column w-100 main"
      gap={24}
      desktopStyle={{ paddingRight: theme.layout.desktopPadding, paddingLeft: theme.layout.desktopPadding }}
      tabletStyle={{ paddingRight: theme.layout.tabletPadding, paddingLeft: theme.layout.tabletPadding }}
      mobileStyle={{ paddingRight: theme.layout.mobilePadding, paddingLeft: theme.layout.mobilePadding }}
    >
      <FlexContainer className="w-100 align-ce">
        <ArrowBack
          className="arrow-back svg-app-color"
          style={{
            cursor: 'pointer',
            marginRight: '16px',
            justifyContent: 'center',
          }}
          onClick={() => history.goBack()}
        />
        <CryptoContainer style={{ marginRight: 8 }}>{tokenData[token].icon}</CryptoContainer>
        <Label fontSize={24} fontFamily="syncopate">
          {token}
        </Label>
      </FlexContainer>
      <FlexContainer gap={16} className="w-100 justify-sb" tabletClassName="column" mobileClassName="column">
        <AnalyticsSimpleWidget
          title={'Price'}
          mainText={
            <FlexContainer className="flex align-fs column" style={{ marginBottom: 7 }}>
              {`$ ${
                pact?.tokensUsdPrice?.[token]
                  ? humanReadableNumber(pact?.tokensUsdPrice?.[token], 3) !== '0.000'
                    ? humanReadableNumber(pact?.tokensUsdPrice?.[token], 3)
                    : (pact?.tokensUsdPrice?.[token]).toFixed(tokenData[token].precision)
                  : '-'
              }`}
              <GraphicPercentage prevValue={price24h?.initial} currentValue={price24h?.final} />
            </FlexContainer>
          }
          subtitle={token !== 'KDX' ? `1 KDX = ${getDecimalPlaces(pact?.tokensUsdPrice?.KDX / pact?.tokensUsdPrice?.[token])} ${token}` : null}
        />
        <AnalyticsSimpleWidget
          title="1M Trading Volume"
          mainText={`$ ${humanReadableNumber(monthlyVolumeRange?.final * monthlyRange?.final)}`}
          subtitle={
            monthlyVolumeRange?.initial && <GraphicPercentage prevValue={monthlyVolumeRange?.initial} currentValue={monthlyVolumeRange?.final} />
          }
        />
        <AnalyticsSimpleWidget
          title="1M Price Delta"
          mainText={`$ ${humanReadableNumber(monthlyRange?.final - monthlyRange?.initial)}`}
          subtitle={<GraphicPercentage prevValue={monthlyRange?.initial} currentValue={monthlyRange?.final} />}
        />
      </FlexContainer>
      <TokenPriceChart tokenData={tokenData[token]} height={300} />
    </FlexContainer>
    // <div>
    //   <CustomButton onClick={() => history.goBack()}>Token Info</CustomButton>
    // </div>
  );
};

export default TokenInfoContainer;
