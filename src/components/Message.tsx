import { ReactElement, useRef, useEffect } from 'react';
import {
  translateReasonsToEnglish,
  DispatchForOneOfGameStates,
} from '../view/core';
import { GameStateOrGameStateForWebRTC, WHITE } from '../core/globals';
import {
  reducerForGameState,
  reducerForGameStateForWebRTC,
  ActionGameState,
  ActionGameStateForWebRTC,
} from '../core/handlers';

import { Pause } from './Pause';
import { RequestMessage } from './RequestMessage';

/* FIXME: how to render div only when it has children.
   I managed to make this work, but there must be a proper way to do this.
 */
/* in order to figure out if component returns null on render
   I call it as a function to recieve resulting jsx/null and convert that to boolean. */
const isReactElementRenderTruthy = (reactElement: ReactElement) => {
  if (typeof reactElement.type === 'function') {
    // FIXME: is it ok to call react function components as functions?
    // FIXME: TS wtf
    return !!reactElement.type(reactElement.props);
  }
  // idk what should happen in this case, this is just a guess.
  return !!reactElement;
};
/* tricky component, because it's insides are also components that may render jsx or null.

   and if there is jsx then there is a need for a div,
   if content is null then there is no need for such div. */
export function Message({
  gameState,
  dispatch,
  dataChannel,
}: {
  gameState: GameStateOrGameStateForWebRTC;
  dispatch: DispatchForOneOfGameStates;
  dataChannel: RTCDataChannel | undefined;
}) {
  const ref = useRef(null);

  const {
    playerColor,
    reasonsForGameOver,
    reasonsToAllowDraw,
    reasonsToPauseGame,
    currentColor,
  } = gameState;

  useEffect(() => {
    if (reasonsToPauseGame.prom) {
      ref?.current?.scrollIntoView();
    }
  }, [reasonsToPauseGame.prom]);

  const jsxTakeDrawMessage = !!Object.keys(reasonsToAllowDraw).length &&
    (!dataChannel || playerColor === currentColor) && (
      <>
        <p>
          Would you like to claim draw (
          {translateReasonsToEnglish(reasonsToAllowDraw)}
          )?
        </p>
        <button
          type="submit"
          onClick={() => {
            dispatch({ type: 'claim draw without move' });
          }}
        >
          take draw
        </button>
      </>
    );

  const jsxEndGameMessage = !!Object.keys(reasonsForGameOver).length && (
    <h2>
      {reasonsForGameOver.checkmate
        ? `Victory of ${currentColor === WHITE ? 'black' : 'white'} (checkmate)`
        : `Draw (${translateReasonsToEnglish(reasonsForGameOver)})`}
    </h2>
  );

  const jsxRequestMessage = (
    <RequestMessage gameState={gameState} dispatch={dispatch} />
  );
  const requestMessageBoolean = isReactElementRenderTruthy(jsxRequestMessage);

  const jsxPause = <Pause gameState={gameState} dispatch={dispatch} />;
  const pauseBoolean = isReactElementRenderTruthy(jsxPause);

  if (
    !jsxTakeDrawMessage &&
    !jsxEndGameMessage &&
    !requestMessageBoolean &&
    !pauseBoolean
  ) {
    return null;
  }

  // FIXME: false positive? autoFocus exists, however it is not visible in resulting dom
  return (
    <div className="message" ref={ref}>
      {jsxRequestMessage}
      {jsxPause}
      {jsxTakeDrawMessage}
      {jsxEndGameMessage}
    </div>
  );
}
