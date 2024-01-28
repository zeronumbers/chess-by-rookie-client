import { Dispatch } from 'react';

import { ActionGameState, ActionGameStateForWebRTC } from '../core/handlers';
import {
  WHITE,
  ROOK,
  KNIGHT,
  BISHOP,
  QUEEN,
  KING,
  PAWN,
  BLACK,
  SQUARES,
  REASON_50MOVE,
  REASON_75MOVE,
  REASON_3FOLD,
  REASON_5FOLD,
  REASON_CHECKMATE,
  REASON_STALEMATE,
  REASON_AGREEMENT,
  ReasonsForGameOver,
  ReasonForGameOver,
} from '../core/globals';

/* object of valid sqs and object of x,y where x and y are from 0 to 7 */

export const sqToXY = Object.fromEntries(
  SQUARES.map((sq, i) => [sq, { x: i % 8, y: i >> 3 }]),
);

export const colorToText = {
  [WHITE]: 'white',
  [BLACK]: 'black',
};

export const pieceToText = {
  [ROOK]: 'rook',
  [KNIGHT]: 'knight',
  [BISHOP]: 'bishop',
  [QUEEN]: 'queen',
  [KING]: 'king',
  [PAWN]: 'pawn',
} as const;

const reasonToEnglish = {
  [REASON_50MOVE]: 'fifty move rule',
  [REASON_75MOVE]: 'seventy-five move rule',
  [REASON_3FOLD]: 'threefold repetition',
  [REASON_5FOLD]: 'fivefold repetition',
  [REASON_CHECKMATE]: 'checkmate',
  [REASON_STALEMATE]: 'stalemate',
  [REASON_AGREEMENT]: 'draw by agreement',
} as const;

export const translateReasonsToEnglish = (reasons: ReasonsForGameOver) =>
  Object.keys(reasons)
    .map((r) => reasonToEnglish[r as ReasonForGameOver])
    .join(', ');

export type DispatchGameState = Dispatch<ActionGameState>;
export type DispatchGameStateForWebRTC = Dispatch<ActionGameStateForWebRTC>;
export type DispatchForOneOfGameStates =
  | DispatchGameState
  | DispatchGameStateForWebRTC;
