import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components/macro';
import { ArrowDown, PixeledArrowDownIcon } from '../../assets';
import CustomButton from './CustomButton';
import tokenData from '../../constants/cryptoCurrencies';
import Label from './Label';
import { useApplicationContext, useGameEditionContext } from '../../contexts';
import { theme } from '../../styles/theme';

const Container = styled.div`
  ${({ $gameEditionView, coin }) => {
    if ($gameEditionView) {
      return css`
        position: absolute;
        right: 20px;
        top: ${({ coin }) => (coin ? 9 : 4)}px;
      `;
    }
  }}
  display: flex;
  align-items: center;
  cursor: pointer;

  svg {
    path {
      fill: ${({ $gameEditionView, theme: { colors }, geColor }) => {
        if ($gameEditionView && geColor) return geColor;
        if (!$gameEditionView) return colors.white;
      }};
    }
  }

  @media (max-width: ${({ theme: { mediaQueries } }) => `${mediaQueries.desktopPixel - 1}px`}) {
    top: ${({ $gameEditionView }) => $gameEditionView && '0px'};
  }
  @media (max-width: ${({ theme: { mediaQueries } }) => `${mediaQueries.mobileSmallPixel}px`}) {
    button {
      padding: 12px 4px !important;
    }
  }
`;

const ElementsContainer = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  svg {
    margin-left: 8px;
  }

  @media (max-width: ${({ theme: { mediaQueries } }) => `${mediaQueries.mobileSmallPixel}px`}) {
    img {
      margin-right: 0px !important;
    }
    span {
      margin-right: 4px;
    }
  }
`;

const InputToken = ({ values, disabledButton, onClick, onMaxClickButton, geColor, withoutMAX }) => {
  const { gameEditionView } = useGameEditionContext();
  const { themeMode } = useApplicationContext();

  return (
    <Container $gameEditionView={gameEditionView} geColor={geColor} coin={values?.coin}>
      {values?.coin ? (
        <>
          {!gameEditionView && !withoutMAX && (
            <CustomButton
              buttonStyle={{
                padding: '12px 8px',
              }}
              fontFamily="basier"
              labelStyle={{ textTransform: 'uppercase' }}
              type="basic"
              fontSize={13}
              onClick={onMaxClickButton}
              disabled={disabledButton}
            >
              Max
            </CustomButton>
          )}
          <ElementsContainer
            $gameEditionView={gameEditionView}
            geColor={geColor}
            onClick={onClick}
            style={{
              background: !gameEditionView && `${theme(themeMode).colors.white}33`,
              borderRadius: !gameEditionView && '20px',
              padding: !gameEditionView && '4px 8px',
            }}
          >
            {tokenData[values.coin]?.icon}
            <Label geFontSize={24} geColor={geColor} style={{ opacity: 1 }}>
              {tokenData[values.coin]?.name}
            </Label>
            {gameEditionView ? <PixeledArrowDownIcon /> : <ArrowDown style={{ opacity: 1 }} />}
          </ElementsContainer>
        </>
      ) : (
        <>
          <CustomButton
            type="basic"
            geBasic
            fontFamily="basier"
            geColor={geColor}
            onClick={onClick}
            geFontSize={24}
            buttonStyle={{
              background: !gameEditionView && `${theme(themeMode).colors.white}33`,
              borderRadius: !gameEditionView && '20px',
              padding: !gameEditionView && '4px 8px',
              marginRight: 0,
              height: !gameEditionView && '28px',
            }}
          >
            <Label geColor={geColor} fontSize={13}>
              Select
            </Label>
            {gameEditionView ? (
              <PixeledArrowDownIcon style={{ marginLeft: 8, marginRight: 0 }} />
            ) : (
              <ArrowDown style={{ marginRight: 0, marginLeft: 8 }} />
            )}
          </CustomButton>
        </>
      )}
    </Container>
  );
};

InputToken.propTypes = {
  icon: PropTypes.element,
  code: PropTypes.string,
};

InputToken.defaultProps = {
  icon: null,
  code: '',
};

export default InputToken;
