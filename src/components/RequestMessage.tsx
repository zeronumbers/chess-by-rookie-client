import { GameStateForWebRTC, REQUEST_OF_UNDO, TRequest } from '../core/globals';
import { DispatchGameStateForWebRTC } from '../view/core';

export function RequestMessage({
  gameState,
  dispatch,
}: {
  gameState: GameStateForWebRTC;
  dispatch: DispatchGameStateForWebRTC;
}) {
  const { playerColor, requests, moveHistory } = gameState;

  if (!playerColor) {
    return null;
  }

  // TS: groupBy does exist.
  const requestsByColor = Object.groupBy(
    requests,
    ({ requester }: TRequest) => requester,
  );

  const requestsOfPlayer: TRequest[] = requestsByColor[playerColor] ?? [];
  const requestsOfOpponent: TRequest[] =
    requestsByColor[playerColor * -1] ?? [];

  if (!requestsOfOpponent.length && !requestsOfPlayer.length) {
    return null;
  }

  /* not sure if "requesting:" is really needed for the player that makes request,
     since he knows what he pressed, and the buttons are not active. */
  return (
    <>
      {requestsOfPlayer.length ? (
        <div>
          <p>requesting:</p>
          <ul>
            {requestsOfPlayer.map((request) => (
              <li key={request.type}>
                {request.type}
                {request.type === REQUEST_OF_UNDO
                  ? ` ${
                      moveHistory.length + 1 - request.moveHistoryLength
                    } "half" move`
                  : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {requestsOfOpponent.length ? (
        <div>
          <p>Opponent requests:</p>
          <ul>
            {requestsOfOpponent.map((request) => (
              <li key={request.type}>
                {request.type}
                {request.type === REQUEST_OF_UNDO
                  ? ` ${
                      moveHistory.length + 1 - request.moveHistoryLength
                    } "half" move`
                  : null}
                {' '}
                <button
                  type="submit"
                  onClick={() => {
                    dispatch({ type: 'agree to request', data: request });
                  }}
                >
                  agree
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
