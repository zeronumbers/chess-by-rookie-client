import { InputPromotionPieces } from './InputPromotionPieces';
import { translateReasonsToEnglish, DispatchForOneOfGameStates } from '../view/core';
import { GameState } from '../core/globals';
import {
  reducerForGameState,
  reducerForGameStateForWebRTC,
  ActionGameState,
  ActionGameStateForWebRTC,
} from '../core/handlers';

export function Pause({
  gameState,
  dispatch,
}: {
  gameState: GameState;
  dispatch: DispatchForOneOfGameStates;
}) {
  const { reasonsToPauseGame, currentColor, playerColor } = gameState;

  if (reasonsToPauseGame.prom) {
    return (
      <InputPromotionPieces
        currentColor={currentColor}
        playerColor={playerColor}
        dispatch={dispatch}
      />
    );
  }

  if (Object.keys(reasonsToPauseGame).length) {
    return (
      <fieldset className="pause">
        <p>
          Please
          {' '}
          <strong>finish your move</strong>
          {' '}
          by deciding if you want to
          take draw or not (
          {translateReasonsToEnglish(reasonsToPauseGame)}
          ):
        </p>

        <label>
          Take draw
          <input
            required
            type="radio"
            name="finish-move-draw"
            onChange={() => {
              dispatch({ type: 'claim draw' });
            }}
          />
        </label>

        <label>
          Do not take draw
          <input
            required
            type="radio"
            name="finish-move-draw"
            onChange={() => {
              dispatch({ type: 'do not claim draw' });
            }}
          />
        </label>
      </fieldset>
    );
  }

  return null;
}
