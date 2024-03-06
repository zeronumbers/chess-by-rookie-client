import '../App.css';
import { useState, useEffect, useRef } from 'react';
// @ts-expect-error: false positive
import { ReactComponent as SVGDefs } from '../assets/defs.svg';
import { Details } from './Details';
import { CapturedPieces } from './CapturedPieces';
import { Ranks, Files } from './RanksAndFiles';
import { Request } from './Request';
import { Message } from './Message';
import { Copy } from './Copy';
import { MoveHistory } from './MoveHistory';
import { CheckingSquares } from './chess-svg-insides/CheckingSquares';
import { OriginSquare } from './chess-svg-insides/OriginSquare';
import { ControlsSquares } from './chess-svg-insides/ControlsSquares';
import { MoveSquares } from './chess-svg-insides/MoveSquares';
import { SquaresControlledBy } from './chess-svg-insides/SquaresControlledBy';
import { Pieces } from './chess-svg-insides/Pieces';
import { UseSquare } from './chess-svg-insides/UseSquare';
import { PreviousMoveSquares } from './chess-svg-insides/PreviousMoveSquares';
import { SVGPins } from './SVGPins';

import {
  GameStateOrGameStateForWebRTC,
  GameStateForWebRTC,
  Color,
  WHITE,
  SQUARES,
  GameState,
} from '../core/globals';

import { DispatchGameState, DispatchGameStateForWebRTC } from '../view/core';

/* FIXME: use of svg was supposed to help with scaling,
  however it has some odd problems where perfectly aligned images
  aren't perfectly aligned at certain scalings.

   this is a problem of svg itself, and wont be fixed */

const sendIfDC = (
  gameState: GameStateOrGameStateForWebRTC,
  dataChannel: RTCDataChannel | undefined,
) => {
  if (dataChannel) {
    dataChannel.send(JSON.stringify(gameState));
  }
};

// scaling using this variable is unfortunatly not supported so do not change this!
// figures are 45
const SQ_SIZE = 55;

// FIXME: when clicked outside of border or promotion labels make origin square null?

// FIXME: this can be done with other conditions like not ! or compare to black
const decideIfReverse = (
  dataChannel: RTCDataChannel | undefined,
  playerColor: Color | undefined,
) => !(dataChannel && playerColor === WHITE);

/* FIXME: problem is that ideally I should use actual react components here,
   but those are designed to be placed at a bigger svg. */
function LegendForChessboard() {
  return (
    <Details
      summaryText="Legend"
      contentJSX={(
        <div className="legend__content">
          <dl>
            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square square--previous-move-target"
                />
                ;
              </svg>
            </dt>
            <dd>last "half" move moved piece to this square</dd>

            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square square--previous-move-origin"
                />
                ;
              </svg>
            </dt>
            <dd>last "half" move moved piece from this square</dd>

            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square--origin"
                />
                ;
              </svg>
            </dt>
            <dd>selected square</dd>

            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square--move"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                />
                ;
              </svg>
            </dt>
            <dd>
              square where selected piece could move (it is shown even when
              piece is not able to move because it is not it's turn to move)
            </dd>

            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square--controlled-by"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square--controlled-by-black"
                />
              </svg>
            </dt>
            <dd>selected square is controlled by this black piece</dd>
            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square--controlled-by"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square--controlled-by-white"
                />
              </svg>
            </dt>
            <dd>selected square is controlled by this white piece</dd>
            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square--controlled-by"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                  className="square--controlled-by-check"
                />
              </svg>
            </dt>
            <dd>this square is checking king</dd>

            <dt>
              <svg
                className="legend__svg"
                viewBox={`0 0 ${SQ_SIZE} ${SQ_SIZE}`}
              >
                <use
                  href="#square--controls"
                  width={`${SQ_SIZE}`}
                  height={`${SQ_SIZE}`}
                />
                ;
              </svg>
            </dt>
            <dd>selected square controls this square</dd>

            <dt>
              <svg
                className="pinned__svg legend__svg"
                viewBox="0 0 100 100"
                x="275"
                y="55"
                width={`${SQ_SIZE}`}
                height={`${SQ_SIZE}`}
              >
                <line className="pinned__line" x1="50" y1="50" x2="50" y2="0" />
                <line className="pinned__line" x1="50" y1="50" x2="0" y2="50" />
                <line
                  className="pinned__line"
                  x1="50"
                  y1="50"
                  x2="100"
                  y2="50"
                />
                <line
                  className="pinned__line"
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="100"
                />
                <line
                  className="pinned__line"
                  x1="50"
                  y1="50"
                  x2="100"
                  y2="0"
                />
                <line
                  className="pinned__line"
                  x1="50"
                  y1="50"
                  x2="0"
                  y2="100"
                />
              </svg>
            </dt>
            <dd>
              this piece is pinned (such piece is controlled by enemy vector
              piece (like queen rook bishop) and on the other side is the king)
            </dd>
          </dl>
        </div>
      )}
    />
  );
}

// gameState is null initially for answerer, but it should be recieved through dataChannel and be set shortly after dataChannel is open.
function Chess(
  props:
    | {
        dataChannel: RTCDataChannel;
        gameState: GameStateForWebRTC | null;
        dispatch: DispatchGameStateForWebRTC;
      }
    | {
        gameState: GameState;
        dispatch: DispatchGameState;
      },
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIXME: TS: how to tell compiler that it is undefined or value?
  // @ts-ignore
  const { dataChannel }: { dataChannel: undefined | RTCDataChannel } = props;
  const { gameState, dispatch } = props;

  const {
    playerColor,
    queueOfActionsToSend,
    idOfLastActionRecieved,
    squareControls,
    pinnedSquares,
    moveHistory,
    currentColor,
    pieceToSquares,
    originSquare,
    targetSquare,
    movesOfOriginSquare,
    checkingSquares,
    reasonsToPauseGame,
    reasonsForGameOver,
    capturedPieces,
  } = gameState || {};

  const [isReverse, setIsReverse] = useState(
    decideIfReverse(dataChannel, playerColor),
  );

  useEffect(() => {
    setIsReverse(decideIfReverse(dataChannel, playerColor));
  }, [playerColor]);

  /* the design of this is unfortunate
     I need to run side effect with a value that i get after state was updated.
     Furthermore making sure that message is indeed delivered requires acknowledgement message.
     And because I keep sending message until acknowlegdgement is recieved,
     idempotence is required for case where opponent recieved message,
     sent acknowledgement and while it goes,
     we send him again message because acknowldegment didn't arrive yet. */
  useEffect(() => {
    if (queueOfActionsToSend?.[0]) {
      const action = queueOfActionsToSend?.[0];
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // sending immediately
      sendIfDC(action, dataChannel);
      // and setting interval in case sending doesnt deliver.
      intervalRef.current = setInterval(() => {
        sendIfDC(action, dataChannel);
      }, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [queueOfActionsToSend?.[0]?.id]);

  if (dataChannel) {
    dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('message recieved', message);

      if (message.type !== 'recieved ACK') {
        console.log('sending ack', message, message.id);
        dataChannel.send(
          JSON.stringify({ type: 'recieved ACK', id: message.id }),
        );

        if (message.subType === 'initial state') {
          console.log('setting initial state');
          dispatch(message);
        } else if (message.id - idOfLastActionRecieved === 1) {
          dispatch(message);
        } else {
          console.log(
            `unexpected message id:${message.id}, idOfLastActionRecieved: ${idOfLastActionRecieved}`,
          );
        }
      } else {
        dispatch(message);
      }
    };
  }

  if (!gameState) {
    return <p>awaiting game state</p>;
  }

  const isGameOver = !!Object.keys(reasonsForGameOver).length;
  return (
    <form
      className="chess"
      onSubmit={(event) => {
        event.preventDefault();
      }}
      autoComplete="off"
    >
      <LegendForChessboard />
      <div className="chess__info">
        <ul>
          <li>
            <Copy value={JSON.stringify(gameState)} description="save" />
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setIsReverse((prevIsReverse) => !prevIsReverse);
              }}
            >
              reverse board
            </button>
          </li>
          {dataChannel ? (
            <Request gameState={gameState} dispatch={dispatch} />
          ) : (
            <>
              <li>
                <button
                  type="button"
                  className="mg-left"
                  onClick={() => {
                    dispatch({ type: 'undo' });
                  }}
                >
                  undo move
                </button>
              </li>
              {isGameOver && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'rematch' });
                    }}
                  >
                    rematch
                  </button>
                </li>
              )}
            </>
          )}
        </ul>
        {!isGameOver && (
          <p>
            <strong className="move-of">
              {`"half" move of: ${currentColor === WHITE ? 'white' : 'black'}`}
            </strong>
            {dataChannel &&
              `, your color: ${playerColor === WHITE ? 'white' : 'black'}`}
          </p>
        )}
      </div>
      <Message
        gameState={gameState}
        dispatch={dispatch}
        dataChannel={dataChannel}
      />
      <div className="chess__inner">
        <div className={`chess__board${isReverse ? ' rotate' : ''}`}>
          <SVGDefs />
          <fieldset className="chess__board-buttons">
            {SQUARES.map((square) => (
              <button
                type="submit"
                key={square}
                id={`${square}`}
                className="chess__board-button"
                onClick={() => {
                  dispatch({ type: 'square chosen', square });
                }}
              />
            ))}
          </fieldset>

          <svg
            className={`chess-board__visuals chess-board ${
              currentColor === WHITE
                ? 'chess-board--white'
                : 'chess-board--black'
            }`}
            viewBox={`0 0 ${SQ_SIZE * 10} ${SQ_SIZE * 10}`}
          >
            <Files size={SQ_SIZE} yPercent={0} isReverse={isReverse} />
            <Files size={SQ_SIZE} yPercent={90} isReverse={isReverse} />
            <Ranks size={SQ_SIZE} xPercent={0} isReverse={isReverse} />
            <Ranks size={SQ_SIZE} xPercent={90} isReverse={isReverse} />

            <svg
              className={
                dataChannel && playerColor !== currentColor ? ' filter-bnw' : ''
              }
              viewBox={`0 0 ${SQ_SIZE * 8} ${SQ_SIZE * 8}`}
              x="10%"
              y="10%"
              width="80%"
              height="80%"
            >
              {/* inside svg order matters and defines whats above or below what,
                  the top items would be background, while bottom would be on top of other items */}
              {isGameOver ? (
                <>
                  <use href="#board" />
                  <Pieces
                    pieceToSquares={pieceToSquares}
                    isReverse={isReverse}
                    size={SQ_SIZE}
                  />
                </>
              ) : Object.keys(reasonsToPauseGame).length ? (
                <>
                  <use href="#board" />
                  {targetSquare && (
                    <UseSquare
                      size={SQ_SIZE}
                      square={targetSquare}
                      className="square--target"
                    />
                  )}
                  <OriginSquare size={SQ_SIZE} originSquare={originSquare} />
                  <Pieces
                    pieceToSquares={pieceToSquares}
                    isReverse={isReverse}
                    size={SQ_SIZE}
                  />
                </>
              ) : (
                <>
                  <use href="#board" />
                  <PreviousMoveSquares size={SQ_SIZE} gameState={gameState} />
                  <CheckingSquares
                    checkingSquares={checkingSquares}
                    size={SQ_SIZE}
                  />

                  <OriginSquare size={SQ_SIZE} originSquare={originSquare} />
                  <ControlsSquares
                    size={SQ_SIZE}
                    originSquare={originSquare}
                    squareControls={squareControls}
                  />

                  <MoveSquares
                    size={SQ_SIZE}
                    movesOfOriginSquare={movesOfOriginSquare}
                  />

                  <SquaresControlledBy size={SQ_SIZE} gameState={gameState} />
                  <Pieces
                    pieceToSquares={pieceToSquares}
                    isReverse={isReverse}
                    size={SQ_SIZE}
                  />
                  <SVGPins pinnedSquares={pinnedSquares} size={SQ_SIZE} />
                </>
              )}
            </svg>
          </svg>
        </div>
        <div className="chess__sidebar">
          {!playerColor ? null : queueOfActionsToSend.length ? (
            <p>
              sending
              {queueOfActionsToSend.length}
              {' '}
              actions
            </p>
          ) : (
            <p>all actions sent</p>
          )}
          <CapturedPieces capturedPieces={capturedPieces} />
          <MoveHistory moveHistory={moveHistory} />
        </div>
      </div>
    </form>
  );
}

export default Chess;
