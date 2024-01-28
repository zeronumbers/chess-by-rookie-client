# About

File for notes about react with webrtc using websocket or manual signaling.

# Problems

it works, kind of. Does it work correctly?

## how do I know that whatever solution I used is correct?

For example doing this:
https://stackoverflow.com/a/74609594


## race conditions?

idk if this is what is happening, but basically events/promises can be executed when cleanup runs, or I guess even after that.

And in that case they shouldn't do anything.

Apparently correct solution is to create in useEffect `let ignore = false` and in cleanup `ingore = true` and then check this variable in each function that is not synchronous.

https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect

### abort controller is only for fetch

link mentions it as one of the solutions but sadly it wont work here.

### order?

Should it be first or last line?
I chose first.

### how it supposedly works

my guess is that:
1. component runs,
2. effect runs newly created function,
3. ignore is false,
4. we call .then() with a function that can see ignore.
5. if cleanup is called ignore is mutated, this is visible to our function.

on the next time effect runs we create a new function for useEffect, and it all goes as if it is first time. so ignore wasnt mutated yet.

```jsx
import { useState, useEffect } from 'react';
import { fetchBio } from './api.js';

export default function Page() {
  const [person, setPerson] = useState('Alice');
  const [bio, setBio] = useState(null);

  useEffect(() => {
    let ignore = false;
    setBio(null);
    fetchBio(person).then(result => {
      if (!ignore) {
        setBio(result);
      }
    });
    return () => {
      ignore = true;
    };
  }, [person]);

  // ...
```

### same but for didMount

there is a variation of this pattern but that detects if component mounted. I don't remember where I have seen it, and what exactly it does, but I think it did initialize variable outside of useEffect, maybe even outside of component. I know that if you want to run something only once you can put it outside of component.


## HMR breaks state?

could be vite specific

```
  const [state, setState] = useState([]);

  useEffect(() => {
    console.log('setting state', state);
    setState((prev) => {
      console.log(prev);
      return [...prev, 1];
    });
  }, []);

```

On page load state would have [1,1] because of strict mode.

logs:
```
setting state []
[]
setting state []
[1]
[1]
```
on hmr it will be
```
setting state [1, 1]
[1, 1]
[1, 1]
```

on build it should be [1]


## Not an effect?!


So when all the hook stuff began everyone knew that if you need to do something once when component loads you do this:
```
useEffect(() => {}, []);
```

But now we get this:
https://react.dev/learn/synchronizing-with-effects#not-an-effect-initializing-the-application

What can be done there? can I create state outside of component?
Suppose I create websocket, or peerconnection, what if I would want to re create it on some fail, how do i do that?

I need event handlers that do set state, how I do that?





## Strict mode

I guess that expected behaviour should be: socket connects twice. two peerconnection are created for same page (all of this with cleanup ofcourse).

I wonder should it also send twice action of player to other player?

### is strict mode even ready to be used?

Looking at issues, there are many nasty things. Kind of ridiculous since it is meant to help you fix bugs, instead it introduces new ones.

### dev is not what will run

Very big reason not to use strict mode

### How exactly does it help?

It runs stuff twice, ok. Some things should not run twice.


## useSyncExternalStore

Should it be used for websocket / webrtc?


# how server should work?

one of the problems actually is that I have websocket and webrtc as separate.
and webrtc sets onmessage for websocket, but server sends message as soon as both users connected, so in theory it may send message before handler is asssigned.

Therefore I need two kinds of messages.

clients send:
'offerer ready' 'answerer ready'

and server should then send:
'both ready'

(this is how rewritten code works)


# Should ref be returned from hooks?

in theory you can use state to hold message, return send function etc.
The thing is that there is no need to render messages. And there is a need to react to new message, which would require an effect, that would watch for messages, and would probably set state after some messages.

# closing and mutating ref is enough right?

both websocket and webrtc can be closed. I am certain that I don't need to remove event handlers. There will be no more events except close, and the object will not be used anymore because ref is overwritten.

# don't need to setstate in cleanup right?

I think setting state to initial state in cleanup is not required, it will at least cause another rerender.

However what do I do if I get state that persists hmr and which appends in useEffect like ice candidates in `rewrite.tsx` (manual signaling).

# put it all into useEffect?

It seems like this is the way to do things, like I did in `rewrite.tsx`, as opposed to my initial style of coding with lots of functions, which probably suffers from race conditions because all stuff is passed as arguments.

But with such style a question is how to deal with different signaling, manual and socket, while still reusing webrtc part.

My attempt to mimic websocket with manual signaling in `rewrite.tsx` doesn't look good.
