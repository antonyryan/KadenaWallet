/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import ApexCharts from 'react-apexcharts';
import { commonColors } from '../../styles/theme';
import { getDailyCandles } from '../../api/kaddex-stats';
import { humanReadableNumber } from '../../utils/reduceBalance';
import { useApplicationContext } from '../../contexts';
import { FlexContainer } from '../shared/FlexContainer';
import AppLoader from '../shared/AppLoader';
import Label from '../shared/Label';
import CustomDropdown from '../shared/CustomDropdown';
import styled from 'styled-components';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

export const GraphCardHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  @media (max-width: ${({ theme: { mediaQueries } }) => `${mediaQueries.mobilePixel + 1}px`}) {
    padding: 15px 0px 0px 15px;
  }
`;

const STYChartContainer = styled(ResponsiveContainer)`
  .recharts-wrapper {
    width: 100% !important;
  }
  .recharts-surface {
    width: 100%;
  }
  .recharts-cartesian-grid {
    display: none;
  }
`;

const StyledApexChart = styled(ApexCharts)`
  .apexcharts-tooltip {
    color: ${commonColors.purple};
  }
  .apexcharts-toolbar {
    z-index: 1;
  }
`;

const ThemeIconContainer = styled.div`
  path {
    fill: ${({ theme: { colors } }) => colors.white};
  }
`;

const initialCurrentData = {
  date: new Date(),
  price: 0,
};

const CHART_MODES = ['line', 'candle'];

const TokenPriceChart = ({ tokenData, height }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [chartMode, setChartMode] = useState(CHART_MODES[0]);
  const [candles, setCandles] = useState([]);
  const [currentData, setCurrentData] = useState(initialCurrentData);
  const [dateStart, setDateStart] = useState(moment().subtract(3, 'months').format('YYYY-MM-DD'));

  const { themeMode } = useApplicationContext();

  useEffect(() => {
    fetchCandles();
  }, [dateStart]);

  const fetchCandles = async () => {
    const asset = (tokenData?.statsID || tokenData?.code) === 'coin' ? 'KDA' : tokenData?.statsID || tokenData?.code;
    const currency = (tokenData?.statsID || tokenData?.code) === 'coin' ? 'USDT' : 'coin';
    const candles = await getDailyCandles(asset, currency, moment(dateStart).toDate());
    setCandles(candles?.data || []);
    if (candles?.data?.length) {
      const last = candles?.data[candles.data.length - 1];
      setCurrentData({
        ...currentData,
        price: last?.usdPrice?.close || last?.price?.close || '-',
      });
    }
    setIsLoading(false);
    return candles;
  };

  const candlesticks = candles?.map((candle) => ({
    x: new Date(candle?.day),
    y: [
      candle?.usdPrice?.open ?? candle?.price?.open,
      candle?.usdPrice?.high ?? candle?.price?.high,
      candle?.usdPrice?.low ?? candle?.price?.low,
      candle?.usdPrice?.close ?? candle?.price?.close,
    ],
  }));

  return isLoading ? (
    <AppLoader containerStyle={{ height: '100%', alignItems: 'center', justifyContent: 'center' }} />
  ) : (
    <FlexContainer className="column align-ce w-100 h-100 background-fill" withGradient style={{ padding: 32 }}>
      <FlexContainer className="flex justify-sb w-100" mobileClassName="column">
        <FlexContainer className="column w-100" mobileStyle={{ marginBottom: 10 }}>
          <Label fontSize={24}>
            ${' '}
            {humanReadableNumber(currentData?.price, 3) !== '0.000'
              ? humanReadableNumber(currentData?.price, 3)
              : humanReadableNumber(currentData?.price, tokenData?.precision)}
          </Label>
          <Label fontSize={16}>{moment(currentData?.date).format('DD/MM/YYYY')}</Label>
        </FlexContainer>
        <ThemeIconContainer className="flex">
          <CustomDropdown
            options={[
              { key: 0, text: 'Line', value: CHART_MODES[0] },
              { key: 1, text: 'Candles', value: CHART_MODES[1] },
            ]}
            containerStyle={{ marginRight: 5 }}
            dropdownStyle={{ padding: 10, height: 30 }}
            onChange={(e, { value }) => {
              setChartMode(value);
            }}
            value={chartMode}
          />
          <CustomDropdown
            options={[
              { key: 0, text: '7d', value: moment().subtract(7, 'day').format('YYYY-MM-DD') },
              { key: 1, text: '1M', value: moment().subtract(1, 'months').format('YYYY-MM-DD') },
              { key: 2, text: '3M', value: moment().subtract(3, 'months').format('YYYY-MM-DD') },
              { key: 3, text: '6M', value: moment().subtract(6, 'months').format('YYYY-MM-DD') },
            ]}
            dropdownStyle={{ minWidth: '66px', padding: 10, height: 30 }}
            onChange={(e, { value }) => {
              setDateStart(value);
            }}
            value={dateStart}
          />
        </ThemeIconContainer>
      </FlexContainer>

      {chartMode === 'line' ? (
        <div style={{ width: '100%', height }}>
          <STYChartContainer>
            <AreaChart
              data={candles?.map((candle) => ({
                name: candle?.day,
                price: candle?.usdPrice?.close || candle?.price?.close,
              }))}
              onMouseMove={({ activePayload }) => {
                if (activePayload) {
                  setCurrentData({
                    date: activePayload[0]?.payload?.name,
                    price: activePayload && activePayload[0]?.payload?.price,
                  });
                }
              }}
              onMouseLeave={() => {
                setCurrentData({
                  date: candles[candles.length - 1]?.date ?? new Date(),
                  price: candles[candles.length - 1]?.usdPrice?.close || candles[candles.length - 1]?.price?.close || '-',
                });
              }}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="color" x1="2" y1="0" x2="1" y2="2">
                  <stop offset="0%" stopColor="#ED1CB5" stopOpacity={0.9} />
                  <stop offset="75%" stopColor="#ED1CB5." stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <Tooltip label="Price" content={() => ''} />
              <Area type="monotone" dataKey="price" stroke="#ED1CB5" strokeWidth={2} fill="url(#color)" activeDot={{ r: 5 }} dot={{ r: 0 }} />
            </AreaChart>
          </STYChartContainer>
        </div>
      ) : (
        <div style={{ width: '100%', height: 'auto' }}>
          <StyledApexChart
            themeMode={themeMode}
            type="candlestick"
            height={350}
            series={[
              {
                name: 'candle',
                data: [...candlesticks],
              },
            ]}
            options={{
              chart: {
                type: 'candlestick',
              },
              tooltip: {
                enabled: true,
                style: {
                  colors: themeMode === 'light' ? commonColors.purple : '#AFB0BA',
                },
              },
              xaxis: {
                type: 'category',
                labels: {
                  formatter: function (val) {
                    return moment(val).format('DD/MM');
                  },
                  style: {
                    colors: themeMode === 'light' ? commonColors.purple : '#AFB0BA',
                  },
                },
                tickAmount: 20,
              },
              yaxis: {
                tooltip: {
                  enabled: true,
                },
                labels: {
                  formatter: function (val) {
                    return val.toFixed(4);
                  },
                  style: {
                    colors: themeMode === 'light' ? commonColors.purple : '#AFB0BA',
                  },
                },
              },
            }}
          />
        </div>
      )}
    </FlexContainer>
  );
};

export default TokenPriceChart;
