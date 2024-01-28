import { assoc } from 'ramda';

import {
  TRequest,
  TRequestType,
  SendableAction,
  REASON_PROMOTION,
  REASON_AGREEMENT,
  Piece,
  EMPTY_SQUARE,
  MoveType,
  PROMOTION_MOVE_TYPE,
  PROMOTION_WITH_CAPTURE_MOVE_TYPE,
  GameState,
  Square,
  REQUEST_OF_DRAW,
  REQUEST_OF_UNDO,
  GameStateForWebRTC,
  REQUEST_OF_REMATCH,
} from './globals';

import { initialGameState } from './initial-state';
import { doMove, undoMove } from './change-state';
import { makeMoves, RequiredForMakeMoves } from './moves';

const pauseOrUpdateGameState = (gameState: GameState): GameState => {
  /* when targetSquare is chosen it could be so that a pause of game is required.

     it can happen because of promotion.

     or 3fold/50move rules.

     in case of promotion we can simply see tempMoveType.
     Promotion is exclusive and cannot happen on same move as 3/5fold or 50/75move.
     it also cannot yet result in checkmate/stalemate since we do not know promotion piece,
     therefore we don't need to do entire gameState update.

     in case of 3fold/50move we must update whole state.
     It is possible to know if it is 50move/3fold rule without update of entire state,
     however it does not mean that we know whether game is paused or not
     because there are edge cases when such rules are overriden by end game rules
     like 5fold/75move and stalemate/checkmate, where a game does not need pause since it is over.

     50move can happen at same moment as stalemate/checkmate or 5fold.
     I am sure that 3fold cannot happen at same moment as stalemate/checkmate.
     However it could happen on same move as 75move, in which case a pause is not needed.

     So to know if we need to pause game or not we need to update whole state. */

  const tempMoveType = gameState.tempMoveType as MoveType;

  if (
    tempMoveType === PROMOTION_MOVE_TYPE ||
    tempMoveType === PROMOTION_WITH_CAPTURE_MOVE_TYPE
  ) {
    return {
      ...gameState,
      reasonsToPauseGame: { [REASON_PROMOTION]: true },
      tempPlacedPiece: null,
    };
  }

  const updatedGameState = doMove(gameState);

  const { reasonsForGameOver, reasonsToPauseGame } = updatedGameState;

  if (Object.keys(reasonsForGameOver).length) {
    return updatedGameState;
  }

  if (Object.keys(reasonsToPauseGame).length) {
    return { ...gameState, reasonsToPauseGame };
  }

  return updatedGameState;
};

export const handleUnpausePromotionPieceChosen = <
  GS extends GameState | GameStateForWebRTC,
>(
  gameState: GS,
  piece: Piece,
): GS =>
  doMove({ ...gameState, tempPlacedPiece: piece, reasonsToPauseGame: {} });

/* By definition promotion cannot happen on same move as 50/75move
   or 3/5fold, so we can set reasonsToPauseGame {} */
export const handleUnpauseMoveWithDrawClaim = <
  GS extends GameState | GameStateForWebRTC,
>(
  gameState: GS,
): GS => ({
  ...doMove(gameState),
  reasonsToPauseGame: {},
  reasonsToAllowDraw: {},
  reasonsForGameOver: gameState.reasonsToPauseGame,
});

const handleDrawClaimedWithoutMove = <
  GS extends GameState | GameStateForWebRTC,
>(
  gameState: GS,
): GS => ({
  ...gameState,
  reasonsToAllowDraw: {},
  reasonsForGameOver: gameState.reasonsToAllowDraw,
});

export const handleUnpauseMoveWithoutDrawClaim = <
  GS extends GameState | GameStateForWebRTC,
>(
  gameState: GS,
): GS => ({
  ...doMove(gameState),
  reasonsToPauseGame: {},
  reasonsToAllowDraw: gameState.reasonsToPauseGame,
});

export const updateOriginSquareAndMoves = <
  GS extends Pick<GameState, 'boardOfColors'> & RequiredForMakeMoves,
  R extends GS & Pick<GameState, 'movesOfOriginSquare' | 'originSquare'>,
>(
  gameState: GS,
  square: Square,
): R => {
  const { boardOfColors } = gameState;

  const updatedOrigin = assoc('originSquare', square, gameState);

  if (boardOfColors[square] !== EMPTY_SQUARE) {
    return assoc(
      'movesOfOriginSquare',
      makeMoves(gameState, square),
      updatedOrigin,
    ) as R;
  }

  return assoc('movesOfOriginSquare', {}, updatedOrigin) as R;
};

export const handleSquareChosen = <GS extends GameState | GameStateForWebRTC>(
  gameState: GS,
  square: Square,
): GS => {
  const {
    originSquare,
    movesOfOriginSquare,
    boardOfColors,
    boardOfPieces,
    currentColor,
    reasonsToPauseGame,
  } = gameState;

  if (Object.keys(reasonsToPauseGame).length) {
    return gameState;
  }

  const gameStateWithOriginSquareAndMovesUpdated = updateOriginSquareAndMoves(
    gameState,
    square,
  );

  if (
    originSquare &&
    boardOfColors[originSquare] === currentColor &&
    movesOfOriginSquare[square]
  ) {
    const newGameState = pauseOrUpdateGameState({
      ...gameState,
      tempMoveType: movesOfOriginSquare[square] as MoveType,
      targetSquare: square,

      // it will be different in case of promotion
      tempPlacedPiece: boardOfPieces[originSquare] as Piece,
    });

    return newGameState;
  }

  return gameStateWithOriginSquareAndMovesUpdated;
};

type ActionsThatAreSharedByBothGameStates =
  | {
      type: 'claim draw' | 'do not claim draw' | 'claim draw without move';
    }
  | {
      type: 'square chosen';
      square: Square;
    }
  | {
      type: 'promotion piece chosen';
      piece: Piece;
    };

export type ActionGameState =
  | ActionsThatAreSharedByBothGameStates
  | { type: 'rematch' | 'undo' };

export type ActionGameStateForWebRTC =
  | ActionsThatAreSharedByBothGameStates
  | { type: 'recieved ACK'; id: number }
  | { type: 'agree to request'; data: TRequest }
  | SendableAction
  | {
      type: 'request draw' | 'request undo' | 'request rematch';
    };

export const reducerForGameState = (
  state: GameState,
  action: ActionGameState,
): GameState => {
  // console.log('reducer', state, action);
  switch (action.type) {
    case 'promotion piece chosen': {
      return handleUnpausePromotionPieceChosen(state, action.piece);
    }

    case 'claim draw without move': {
      return handleDrawClaimedWithoutMove(state);
    }

    case 'claim draw': {
      return handleUnpauseMoveWithDrawClaim(state);
    }

    case 'do not claim draw': {
      return handleUnpauseMoveWithoutDrawClaim(state);
    }
    case 'square chosen': {
      return handleSquareChosen(state, action.square);
    }
    case 'rematch': {
      return initialGameState;
    }
    case 'undo': {
      return undoMove(state);
    }
    default: {
      throw new Error(`Unknown action type: ${action.type}`);
    }
  }
};

const clearRequests = (gameState: GameStateForWebRTC): GameStateForWebRTC => ({
  ...gameState,
  requests: [],
});

const makeRequest = (
  gameState: GameStateForWebRTC,
  requestType: TRequestType,
): TRequest => ({
  type: requestType,
  requester: gameState.playerColor,
  moveHistoryLength: gameState.moveHistory.length,
});

const addRequest = (
  gameState: GameStateForWebRTC,
  request: TRequest,
): GameStateForWebRTC => ({
  ...gameState,
  requests: [...gameState.requests, request],
});

const addActionToSend = (
  gameState: GameStateForWebRTC,
  partOfAction:
    | Pick<SendableAction, 'subType' | 'data'>
    | Pick<SendableAction, 'subType'>,
): GameStateForWebRTC => {
  const { data, subType } = partOfAction;

  const nextId = gameState.idOfLastActionOnQueue + 1;

  const action = {
    type: 'recieved action of opponent',
    id: nextId,
    subType,
  };

  if (data) {
    action.data = data;
  }

  return {
    ...gameState,
    queueOfActionsToSend: [...gameState.queueOfActionsToSend, action],
    idOfLastActionOnQueue: nextId,
  };
};

const agreeToRequest = (
  gameState: GameStateForWebRTC,
  request: TRequest,
): GameStateForWebRTC => {
  switch (request.type) {
    case REQUEST_OF_DRAW: {
      return clearRequests({
        ...gameState,
        reasonsToPauseGame: {},
        reasonsToAllowDraw: {},
        reasonsForGameOver: { [REASON_AGREEMENT]: true },
      });
    }
    case REQUEST_OF_UNDO: {
      const { moveHistoryLength } = request;

      let resultGS = gameState;

      while (resultGS.moveHistory.length !== moveHistoryLength) {
        resultGS = undoMove(resultGS);
      }

      return clearRequests({
        ...undoMove(gameState),
      });
    }
    case REQUEST_OF_REMATCH: {
      return clearRequests({
        ...gameState,
        ...initialGameState,
        playerColor: gameState.playerColor * -1,
      });
    }
    default: {
      throw new Error('unknown request');
    }
  }
};

const updateIdOfLastActionRecieved = (
  gameState: GameStateForWebRTC,
  idOfLastActionRecieved: number,
): GameStateForWebRTC => ({
  ...gameState,
  idOfLastActionRecieved,
});

// state could be null only when recieve is called for the first time for the answerer side
export const reducerForGameStateForWebRTC = (
  state: GameStateForWebRTC | null,
  action: ActionGameStateForWebRTC,
): GameStateForWebRTC => {
  console.log('webrtc reducer', state, action);
  switch (action.type) {
    case 'recieved ACK': {
      // FIXME: this doesn't account for wrong order of messages!
      // FIXME: can it be wrong order?
      return {
        ...(state as GameStateForWebRTC),
        queueOfActionsToSend: state!.queueOfActionsToSend.filter(
          (obj) => obj.id !== action.id,
        ),
      };
    }

    /* assuming that this is used only when we recieved correct id, in other words:
       action with recieved id was never processed before; */
    case 'recieved action of opponent': {
      const { id, subType } = action;
      // TS: ignore, when used, the state will exist and it would have both square props.
      const { originSquare, targetSquare } = action.data ?? {};

      // FIXME: this crashes in react strict mode.
      /* if (state && id - state.idOfLastActionRecieved !== 1) {
         throw new Error(
           `reducer was called with an action of wrong id: ${id}, idOfLastActionOnQueue: ${
           state.idOfLastActionOnQueue
           }`
         );
       } */

      /* debatable decison: create a function here each time as opposed to:
         - duplication of code
         - using fall through of switch somehow */
      // TS: ignore this, when it is actually used it will be GameStateForWebRTC
      const nextState: GameStateForWebRTC = clearRequests(
        updateIdOfLastActionRecieved(state, id),
      );
      const returnGameStateWithMoveMade = (): GameStateForWebRTC =>
        handleSquareChosen(
          handleSquareChosen(nextState, originSquare),
          targetSquare,
        );

      switch (subType) {
        case 'move of opponent': {
          return returnGameStateWithMoveMade();
        }
        case 'move of opponent with promotion': {
          const { tempPlacedPiece } = action.data;
          return handleUnpausePromotionPieceChosen(
            returnGameStateWithMoveMade(),
            tempPlacedPiece,
          );
        }

        case 'move of opponent without draw claim': {
          return handleUnpauseMoveWithoutDrawClaim(
            returnGameStateWithMoveMade(),
          );
        }

        case 'move of opponent with draw claim': {
          return handleUnpauseMoveWithDrawClaim(returnGameStateWithMoveMade());
        }

        case 'opponent claimed draw without move': {
          return clearRequests(
            updateIdOfLastActionRecieved(
              handleDrawClaimedWithoutMove(state!),
              id,
            ),
          );
        }

        // tricky case, because before it is set there is no id to compare.
        case 'initial state': {
          return action.data;
        }

        case 'opponent made request': {
          return addRequest(
            updateIdOfLastActionRecieved(state!, id),
            action!.data,
          );
        }

        case 'opponent agreed to request': {
          return agreeToRequest(
            updateIdOfLastActionRecieved(state!, id),

            action.data,
          );
        }

        default: {
          throw new Error(`unknown subType: ${subType}`);
        }
      }
    }

    case 'promotion piece chosen': {
      return clearRequests(
        addActionToSend(
          handleUnpausePromotionPieceChosen(state!, action.piece),
          {
            subType: 'move of opponent with promotion',
            data: {
              originSquare: state!.originSquare,
              targetSquare: state!.targetSquare,
              tempPlacedPiece: action.piece,
            },
          },
        ),
      );
    }
    case 'claim draw': {
      return clearRequests(
        addActionToSend(handleUnpauseMoveWithDrawClaim(state!), {
          subType: 'move of opponent with draw claim',
          data: {
            originSquare: state!.originSquare,
            targetSquare: state!.targetSquare,
          },
        }),
      );
    }

    case 'do not claim draw': {
      return clearRequests(
        addActionToSend(handleUnpauseMoveWithoutDrawClaim(state!), {
          subType: 'move of opponent without draw claim',
          data: {
            originSquare: state!.originSquare,
            targetSquare: state!.targetSquare,
          },
        }),
      );
    }

    case 'claim draw without move': {
      return clearRequests(
        addActionToSend(handleDrawClaimedWithoutMove(state!), {
          subType: 'opponent claimed draw without move',
        }),
      );
    }

    case 'square chosen': {
      const { square } = action;

      if (state!.currentColor === state!.playerColor) {
        const newGameState = handleSquareChosen(state!, square);

        // make sure that this doesn't happen on pause!
        if (state!.moveHistory.length < newGameState.moveHistory.length) {
          return clearRequests(
            addActionToSend(newGameState, {
              subType: 'move of opponent',
              data: { originSquare: state!.originSquare, targetSquare: square },
            }),
          );
        }

        return newGameState;
      }
      return updateOriginSquareAndMoves(state!, square);
    }

    /* if sending of state works correctly,
       then it would first send initial state and then the request.
      therefore it is not possible for state to be null when requests are sent */
    /* why send full request instead of just subType?
       because request has moveHistoryLength which cannot be known by opponent */
    case 'request undo': {
      const request = makeRequest(state!, REQUEST_OF_UNDO);

      return addRequest(
        addActionToSend(state!, {
          subType: 'opponent made request',
          data: request,
        }),
        request,
      );
    }
    case 'request draw': {
      const request = makeRequest(state!, REQUEST_OF_DRAW);

      return addRequest(
        addActionToSend(state!, {
          subType: 'opponent made request',
          data: request,
        }),
        request,
      );
    }

    case 'request rematch': {
      const request = makeRequest(state!, REQUEST_OF_REMATCH);

      return addRequest(
        addActionToSend(state!, {
          subType: 'opponent made request',
          data: request,
        }),
        request,
      );
    }

    case 'agree to request': {
      return addActionToSend(agreeToRequest(state!, action.data), {
        subType: 'opponent agreed to request',

        data: action.data,
      });
    }

    default: {
      throw new Error(`Unknown action type: ${action.type}`);
    }
  }
};
