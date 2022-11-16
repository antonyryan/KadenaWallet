import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import SwapContainer from '../containers/SwapContainer';
import DaoContainer from '../containers/DaoContainer';
import AnalyticsContainer from '../containers/AnalyticsContainer';
import GameEditionMenuContainer from '../components/game-edition-v2/GameEditionMenuContainer';
import GameEditionStartAnimation from '../components/game-edition-v2/GameEditionStartAnimation';
import {
  ROUTE_INDEX,
  ROUTE_STATS,
  ROUTE_GAME_START_ANIMATION,
  ROUTE_GAME_EDITION_MENU,
  ROUTE_ANALYTICS,
  ROUTE_MY_SWAP,
  ROUTE_LIQUIDITY_TOKENS,
  ROUTE_LIQUIDITY_MY_LIQUIDITY,
  ROUTE_LIQUIDITY_POOLS,
  ROUTE_LIQUIDITY_ADD_LIQUIDITY_SINGLE_SIDED,
  ROUTE_LIQUIDITY_ADD_LIQUIDITY_DOUBLE_SIDED,
  ROUTE_LIQUIDITY_REMOVE_LIQUIDITY,
  ROUTE_STAKE,
  ROUTE_UNSTAKE,
  ROUTE_DAO,
  ROUTE_DAO_PROPOSAL,
  ROUTE_LIQUIDITY_REWARDS,
  ROUTE_ANALYTICS_KDX,
  ROUTE_ANALYTICS_STATS,
  ROUTE_TOKEN_INFO,
} from './routes';
import SwapHistoryContainer from '../containers/SwapHistoryContainer';
import { useGameEditionContext } from '../contexts';
import StatsHistoryGameEditionContainer from '../containers/StatsHistoryGameEditionContainer';
import LiquidityContainer from '../containers/LiquidityContainer';
import AddLiquidityContainer from '../components/liquidity/AddLiquidityContainer';
import RemoveLiquidityContainer from '../containers/RemoveLiquidityContainer';
import StakeContainer from '../containers/StakeContainer';
import TokenInfoContainer from '../containers/TokenInfoContainer';

export default () => {
  const { gameEditionView } = useGameEditionContext();
  return (
    <Router>
      <Layout>
        {gameEditionView ? (
          <Switch>
            <Route exact path={ROUTE_GAME_START_ANIMATION} component={GameEditionStartAnimation} />
            <Route exact path={ROUTE_GAME_EDITION_MENU} component={GameEditionMenuContainer} />
            <Route exact path={ROUTE_INDEX} component={SwapContainer} />
            <Route exact path={ROUTE_MY_SWAP} component={SwapHistoryContainer} />
            <Route exact path={ROUTE_STATS} component={StatsHistoryGameEditionContainer} />
          </Switch>
        ) : (
          <Switch>
            <Route exact path={ROUTE_INDEX} component={SwapContainer} />
            <Route exact path={ROUTE_MY_SWAP} component={SwapHistoryContainer} />
            <Route
              exact
              path={[ROUTE_LIQUIDITY_TOKENS, ROUTE_LIQUIDITY_POOLS, ROUTE_LIQUIDITY_MY_LIQUIDITY, ROUTE_LIQUIDITY_REWARDS]}
              component={LiquidityContainer}
            />
            <Route
              exact
              path={[ROUTE_LIQUIDITY_ADD_LIQUIDITY_SINGLE_SIDED, ROUTE_LIQUIDITY_ADD_LIQUIDITY_DOUBLE_SIDED]}
              component={AddLiquidityContainer}
            />
            <Route exact path={ROUTE_LIQUIDITY_REMOVE_LIQUIDITY} component={RemoveLiquidityContainer} />
            <Route exact path={[ROUTE_DAO, ROUTE_DAO_PROPOSAL]} component={DaoContainer} />
            <Route exact path={[ROUTE_ANALYTICS, ROUTE_ANALYTICS_KDX, ROUTE_ANALYTICS_STATS]} component={AnalyticsContainer} />
            <Route exact path={[ROUTE_STAKE, ROUTE_UNSTAKE]} component={StakeContainer} />
            <Route exact path={ROUTE_TOKEN_INFO} component={TokenInfoContainer} />
            {/*
             Remember to delete
            <Route exact path={ROUTE_BUY_CRYPTO} component={BuyCryptoContainer} /> */}
          </Switch>
        )}
      </Layout>
    </Router>
  );
};
