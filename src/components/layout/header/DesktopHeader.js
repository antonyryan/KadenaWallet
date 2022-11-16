import React from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components/macro';
import { KaddexLightModeLogo, KaddexLogo } from '../../../assets';
import { ROUTE_INDEX } from '../../../router/routes';
import menuItems from '../../menuItems';
import RightHeaderItems from './RightHeaderItems';
import HeaderItem from '../../../components/shared/HeaderItem';
import { useApplicationContext, useGameEditionContext } from '../../../contexts';
import GameEditionModeButton from './GameEditionModeButton';
import useWindowSize from '../../../hooks/useWindowSize';

const Container = styled.div`
  display: flex;
  flex-flow: row;
  align-items: center;
  justify-content: space-between;
  min-height: ${({ theme: { header } }) => `${header.height}px`};
  padding: ${({ theme: { layout } }) => `0 ${layout.desktopPadding}px`};
  padding-top: 16px;
  zoom: ${({ resolutionConfiguration }) =>
    resolutionConfiguration && resolutionConfiguration['normal-mode'].scale > 1 ? resolutionConfiguration['normal-mode'].scale : 1};

  .header {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }
`;

const LeftContainer = styled.div`
  display: flex;
  align-items: center;
  margin-right: 25px;
  & > *:not(:last-child) {
    margin-right: 25px;
  }
  .fadeOut {
    visibility: hidden;
    opacity: 0;
    transition: visibility 0s 1s, opacity 1s linear;
  }
  .fadeIn {
    visibility: visible;
    opacity: 1;
    transition: opacity 1s linear;
  }
`;

const AnimatedDiv = styled.div`
  display: flex;
  align-items: center;
  & > *:not(:last-child) {
    margin-right: 24px;
  }
`;

const DesktopHeader = ({ className }) => {
  const history = useHistory();
  const { gameEditionView } = useGameEditionContext();
  const { resolutionConfiguration } = useApplicationContext();

  const [width, height] = useWindowSize();
  const { themeMode } = useApplicationContext();
  return (
    <Container className={className} resolutionConfiguration={resolutionConfiguration}>
      <LeftContainer>
        {themeMode === 'dark' ? (
          <KaddexLogo style={{ cursor: 'pointer', zIndex: 1 }} onClick={() => history.push(ROUTE_INDEX)} />
        ) : (
          <KaddexLightModeLogo style={{ cursor: 'pointer', zIndex: 1 }} onClick={() => history.push(ROUTE_INDEX)} />
        )}

        <AnimatedDiv className={gameEditionView ? 'fadeOut' : 'fadeIn'}>
          {menuItems.map((item, index) => (
            <HeaderItem key={index} item={item}>
              {item.label}
            </HeaderItem>
          ))}
        </AnimatedDiv>
      </LeftContainer>

      {width >= resolutionConfiguration?.width && height >= resolutionConfiguration?.height && gameEditionView && (
        <GameEditionModeButton className="header" />
      )}

      <RightHeaderItems />
    </Container>
  );
};

export default DesktopHeader;
