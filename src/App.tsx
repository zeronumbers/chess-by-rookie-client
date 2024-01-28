import { v1 as uuidv1 } from 'uuid';
import { useState, useReducer } from 'react';
import './App.css';
import { omit } from 'ramda';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import {
  GameState,
  BLACK,
  WHITE,
  Color,
  GameStateForWebRTC,
} from './core/globals';

import {
  WebRTCWithServerAnswerer,
  WebRTCWithServerOfferer,
} from './components/WebRTCWithServer';

import {
  makeJSONObjectValidator,
  TextArea,
  Validate,
} from './components/TextArea';

import { SubmitButton } from './components/SubmitButton';

import { reducerForGameState } from './core/handlers';

import Chess from './components/Chess';

import { initialGameState } from './core/initial-state';
import {
  WebRTCWithoutServerAnswerer,
  WebRTCWithoutServerOfferer,
} from './components/WebRTCWithoutServer';

// these two work, but are not finished
import { AnswerWithSocketSignaling, OfferWithSocketSignaling } from './rewrite';

const validateGameStateJSON: Validate = makeJSONObjectValidator(
  Object.keys(initialGameState),
);

/* TODO: it could tell user that gameText already has playerColor,
   and that they selected a different one. */
function CreateGame({
  Comp,
  isHotseat,
}: {
  Comp:
    | typeof Chess
    | typeof WebRTCWithoutServerOfferer
    | typeof WebRTCWithoutServerAnswerer
    | typeof WebRTCWithServerAnswerer
    | typeof WebRTCWithServerAnswerer;
  isHotseat?: true;
}) {
  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const [gameState, setGameState] = useState<
    GameState | GameStateForWebRTC | null
  >(null);
  const [isCreate, setIsCreate] = useState(false);
  const [gameText, setGameText] = useState('');

  // TS: gameState is not null when isCreate is true
  if (isCreate && gameState) {
    if (isHotseat) {
      return (
        <Comp
          gameState={omit(
            ['playerColor', 'shouldSend', 'requester', 'request'],
            gameState,
          )}
        />
      );
    }

    const requests = gameState.requests ?? [];

    const gameStateWithWebRTCProps = {
      ...gameState,
      playerColor,
      queueOfActionsToSend: [
        {
          type: 'recieved action of opponent',
          subType: 'initial state',
          data: {
            ...gameState,
            playerColor: playerColor * -1,
            queueOfActionsToSend: [],
            idOfLastActionOnQueue: 0,
            idOfLastActionRecieved: 1,
            requests,
          },

          id: 1,
        },
      ],
      idOfLastActionOnQueue: 1,
      idOfLastActionRecieved: 0,
      requests,
    };

    return <Comp gameState={gameStateWithWebRTCProps} />;
  }

  return (
    <form
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();

        setGameState(JSON.parse(gameText));
        setIsCreate(true);
      }}
    >
      {isHotseat ? null : (
        <fieldset>
          <legend>Color of your pieces</legend>
          <label>
            <input
              onChange={() => {
                setPlayerColor(WHITE);
              }}
              type="radio"
              name="player-color"
              required
            />
            White
          </label>
          <label>
            <input
              onChange={() => {
                setPlayerColor(BLACK);
              }}
              type="radio"
              name="player-color"
              required
            />
            Black
          </label>
        </fieldset>
      )}
      <fieldset>
        <legend>Game state</legend>
        <p>
          <button
            type="button"
            onClick={() => {
              setGameText(JSON.stringify(initialGameState));
            }}
          >
            Fill for new game
          </button>
          {' '}
          or paste save text to continue game
        </p>

        <TextArea
          name="gameState"
          isRequired
          labelText="game state"
          text={gameText}
          setText={setGameText}
          validate={validateGameStateJSON}
        />
      </fieldset>

      <SubmitButton />
    </form>
  );
}

function ChessStateProvider(props: { gameState: GameState }) {
  const [gameState, dispatch] = useReducer(
    reducerForGameState,
    props.gameState,
  );
  return <Chess gameState={gameState} dispatch={dispatch} />;
}

// FIXME: should strings of urls be in view/core.ts file?

function Root() {
  /* explaining why uuid v1(time+place) instead of v4(random):
     - I believe v1 will have less collisions than v4
     - I think that information stored in v1 (time and place)
       is already known to opponent and to server */
  const uuid = uuidv1();

  // FIXME: should it mention about symmetric nat?
  return (
    <>
      <Link to={`/offerer/${uuid}`}>
        webrtc chess using server for signaling
      </Link>
      <br />
      <Link to="/offerer">webrtc chess using manual signaling</Link>
      <br />
      <Link to="/hotseat">hotseat chess (play in same tab without webrtc)</Link>

      <br />
    </>
  );
}

function Header({ children }) {
  return (
    <>
      <header>
        <h1>
          <Link to="/">Chess by rookie</Link>
        </h1>
      </header>
      {children}
    </>
  );
}

/* every path has Header and some component, maybe better to map over array of
   path/element and add Header using one function,
   in one place rather than adding it to each entry. */
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Header>
        <Root />
      </Header>
    ),
  },

  {
    path: '/offerer/:id',
    element: (
      <Header>
        {/* <CreateGame Comp={OfferWithSocketSignaling} /> */}
        <CreateGame Comp={WebRTCWithServerOfferer} />
      </Header>
    ),
  },

  {
    path: '/offerer',
    element: (
      <Header>
        <CreateGame Comp={WebRTCWithoutServerOfferer} />
      </Header>
    ),
  },

  {
    path: '/answerer/:id',
    element: (
      <Header>
        {/* <AnswerWithSocketSignaling /> */}
        <WebRTCWithServerAnswerer />
      </Header>
    ),
  },

  {
    path: '/answerer',
    element: (
      <Header>
        <WebRTCWithoutServerAnswerer />
      </Header>
    ),
  },

  {
    path: '/hotseat',
    element: (
      <Header>
        <CreateGame Comp={ChessStateProvider} isHotseat />
      </Header>
    ),
  },
]);

function App() {
  return (
    <div className="App">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
