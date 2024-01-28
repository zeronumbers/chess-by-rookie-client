# About

This project does two things:

- frontend for chess game using react, webrtc and websocket, with chess board being rendered in svg.
- core that describes how game state is represented as well as how to handle it's updates like player's choice of move or undo of previous move.

the server side that deals with websocket server can be found in project called: `chess-by-rookie-server`

# SVGs of pieces

are in the /src/assets/defs.svg

are made by: https://commons.wikimedia.org/wiki/User:Cburnett
taken from: https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces
under license: Creative Commons Attribution-Share Alike 3.0 Unported

some small changes were made, they are written in that file as comment at the top of file.

# Variable naming

<https://github.com/kettanaito/naming-cheatsheet>

## mention invlid instead of valid

    good: `Square` and `SquareUnvalidated`
    bad: `SquareValid` and `Square`



## typescript union is singular

union is singular name like:

```js
export type MoveType =
      | typeof NORMAL_MOVE_TYPE
      | typeof CAPTURE_MOVE_TYPE
      | typeof EN_PASSANT_MOVE_TYPE
      | typeof DOUBLE_FORWARD_MOVE_TYPE
      | typeof KINGSIDE_MOVE_TYPE
      | typeof QUEENSIDE_MOVE_TYPE
      | typeof PROMOTION_MOVE_TYPE
      | typeof PROMOTION_WITH_CAPTURE_MOVE_TYPE;
```

# Terminology

## x y

x - file (in chess: a,b,c...)
y - rank (in chess: 1,2,3...)

both can be 0-7


## square

an index of boards(color and piece)

there are two types of squares, valid and invalid.

because board is represented as 16x16 and chess field is 8x8, only the 8x8 are valid squares, the rest are used to figure out if the move is outside of board and is therefore impossible.


## algebraicSquare

it is a square, but represented as a string that has normal chess name of square like 'e4'.


## figure

figure (of piece), in moveHistory it will be a string that holds a piece like '♞'.


## move

an action of user interacts with piece(s) on board.
In chess this is called `half move` or `ply` (i think this one is rarely used outside of computing).


## moveType

indicator that tells how to update state if a move is taken.


## piece

chess piece


## vector piece

a piece that can move in a line, so it is `queen, rook and bishop`
non vector pieces are `king knight and pawn`


## control

An attacking pseudo move.
For example a pawn cannot go to diagonal square if there is no enemy there, however it controls such square, and enemy king cannot go there.

Important to note that the squares in front of pawn are not controlled (by the pawn itself) even if it actually can go there.

Also the square where the piece is located is not controlled by itself.

to make code more general the empty square also can have control object, and it looks like an empty object, as opposed to control of pieces which may be an object of squares with direction



# About react hooks

It is very likely that many things are wrong, especially dependencies.

I think it would be easier to rewrite from scratch than to fix it.

I think that holding individual refs for rtcpeerconnection and for rtcdatachannel is inconvenient, and doesn't give much.
I think that having many individual states is also inconvenient and should be replaced with reducer.

I think websocket and manual signaling should not be so different, in hooks.
manual signaling should mimic webSocket, for .send .onmessage.

In the end, just don't use react or don't use webrtc. Find a hook that does it.

For custom hooks, it seems like creating a big pile of code in one place is preffered way of doing things, as opposed to creating small functions like I did.

websocket server also has to be designed specificly for react strict mode, because with it, answerer ends up being connected before offerer.

## rewrite.tsx

there is an unfinished rewrite, of websocket and webrtc custom hooks and server and components that use those. I managed to make it work with websocket, but for manual signaling had problems, additionally it has only necessary parts for webrtc, I didn't make error components.

an attempt was made to make it work under strict mode, and it works for signaling with websocket.

I am no longer sure that making manual signaling mimic websocket is a good idea.
The easiest thing to do is just completely integrate both signalings into their own webrtc hooks with big code duplication of webrtc in both cases.

Why not mimic?
It feels wrong that I have to wrap it all like this, it is oop style of coding where you do everything as object.
I guess I also cannot use classes or prototypes, because I have to create their definition inside useeffect, and in that case they would be created each time, so there is no value from storing methods on prototype since prototype is going to be created each effect.
Also it is just additional work that doesnt do much, I get a handler that calls send that calls a handler that sets state, where I could set state in the first handler. It becomes more difficult to reason about.

Why not functions as in first design, the one that works?
The solution to race conditions of asynchronous functions is to see `ignore` that is not passed as argument, passing it as argument would create a copy with a frozen value. I would say it is a disaster already because to avoid race condition we have to introduce such mutable state.
Could an object with prop work? Probably ref should work, but it is shared for all handlers, expired and newly created ones, so that is a problem.

Whats the react way?

```
let y = {n: 1};
let x = 1

function show(n, x) {
  setTimeout(() => {
    console.log(n, x);
  }, 1000);
}

show(y, x);
y.n = 2; // it has to be same object, if line is replaced with: `y = {n: 2}` it will log {n: 1}
x = 2
// logs {n: 2}, 1
```

So I guess it is possible to do this with an object like that, in useEffect an object is created like: `const ignore = {ignore: false}`
such ignore object is passed to functions that create handlers, and inside handlers ignore prop is checked, on effect cleanup `ignore.ignore = true`.

# How to name props of state returned from hooks?

for example websocket hook, should it return `{ref, state}` or `{webSocketRef, webSocketState}` ? Second case won't have name collisions when destructured.

This gets trickier because websocket is used for signaling, so should it be returning signalingRef and signalingState? to make it same to manual signaling?

# How it was configured

1. creation of vite project with eslint and prettier
see file `how-project-was-created.md`

2. install dependencies:
   `npm install ramda react-router-dom react-window uuid`

3. install devDependencies:
   `npm install --save-dev @types/ramda @vitejs/plugin-basic-ssl vite-plugin-svgr vitest`

4. vite.config.ts - add bunch of stuff
```import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: { exportType: 'named', ref: true },
      include: '**/*.svg',
    }),

    basicSsl(),
  ],
  server: {
    /* when using firefox and host is localhost webrtc will fail. You need to host it from "local nic ip" like 192.168.x.x */
    https: true,
  },
  build: {
    sourcemap: true,
  },
});
```

5. src/vite-env.d.ts - add line:
`/// <reference types="vite-plugin-svgr/client" />`

6. package.json - add test script and change build to be without tsc.

7. remove react strict mode
