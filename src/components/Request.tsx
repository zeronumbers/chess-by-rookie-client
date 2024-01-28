import {
  GameStateForWebRTC,
  REQUEST_OF_DRAW,
  REQUEST_OF_UNDO,
  REQUEST_OF_REMATCH,
} from '../core/globals';

import { DispatchGameStateForWebRTC } from '../view/core';

export function Request({
  gameState,
  dispatch,
}: {
  gameState: GameStateForWebRTC;
  dispatch: DispatchGameStateForWebRTC;
}) {
  const { reasonsForGameOver, requests } = gameState;

  const isGameOver = !!Object.keys(reasonsForGameOver).length;

  return (
    <>
      <li>
        <button
          type="button"
          disabled={requests.some((obj) => obj.type === REQUEST_OF_UNDO)}
          className="mg-left"
          onClick={() => {
            dispatch({ type: 'request undo' });
          }}
        >
          request undo
        </button>
      </li>
      {isGameOver ? (
        <li>
          <button
            disabled={requests.some((obj) => obj.type === REQUEST_OF_REMATCH)}
            type="button"
            onClick={() => {
              dispatch({ type: 'request rematch' });
            }}
          >
            request rematch
          </button>
        </li>
      ) : (
        <li>
          <button
            disabled={requests.some((obj) => obj.type === REQUEST_OF_DRAW)}
            type="button"
            onClick={() => {
              dispatch({ type: 'request draw' });
            }}
          >
            request draw
          </button>
        </li>
      )}
    </>
  );
}
