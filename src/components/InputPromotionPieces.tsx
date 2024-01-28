import { ChangeEvent } from 'react';
import {
 WHITE, Color, QUEEN, ROOK, BISHOP, KNIGHT,
} from '../core/globals';
import { pieceToText, DispatchForOneOfGameStates } from '../view/core';

const piecesPromotion = [QUEEN, ROOK, BISHOP, KNIGHT] as const;

// renders "buttons" that choose promotion piece
export function InputPromotionPieces({
  playerColor,
  currentColor,
  dispatch,
}: {
  playerColor: Color | undefined;
  currentColor: Color;
  dispatch: DispatchForOneOfGameStates;
}) {
  if (playerColor === currentColor || !playerColor) {
    const handleChange = (event: ChangeEvent) => {
      event.preventDefault();
      // FIXME: TS: false positive? value actually exists
      dispatch({ type: 'promotion piece chosen', piece: event.target.value });
    };

    return (
      <fieldset className="pause promotion">
        <legend>
          <strong>Please finish your move by choosing promotion piece:</strong>
        </legend>
        <div className="promotion__items">
          {piecesPromotion.map((piece) => {
            const textPiece = pieceToText[piece];

            return (
              <label key={piece} className="promotion__item">
                <strong>{textPiece}</strong>
                <svg aria-hidden="true" width="45" height="45">
                  <use
                    href={`#${textPiece}`}
                    className={
                      currentColor === WHITE ? 'piece--white' : 'piece--black'
                    }
                  />
                </svg>
                <input
                  required
                  type="radio"
                  name="promotion-piece"
                  value={piece}
                  onChange={handleChange}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return null;
}
