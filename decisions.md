# bad
## individual components for answerer/offerer

I think this is bad because they are mostly same, there are few differences but it can be solved by providing role as prop and branching using it.

## using react internals? JSXtoBoolean (do not render div if it's content is empty)
I need somehow to render div conditionally, based on it's content, if there is no content I don't want to render empty div.

Unfortunately, idk how to do it better than the way I did.


## not testing

obviously.

There are many reasons here, but mostly I d say that I just don't like tooling, I use spacemacs, but what I want is something like lighttable with instarepl, where you write code and see result immediately, this is testing as you write. sadly I guess very few people really need it or see value in it, but I think it is extremely important, feedback loop is instant and you don't have to do any additional steps.

using clojure on emacs is much better experience than js, I can at least send whole file to repl to get somewhat similar result, but without convenience of instarepl. In js this usually gets stuck on literally second time that you load file since everything uses const, and you cannot redefine it.

using vitest is kind of ok, the rerunning of tests on file save is nice. but the ceremony of writing boiler plate and even import/export is not fun at all. Furthermore I think that keeping tests next to code that they test is very useful, however it requires code folding from editor, which not everyone has, and I think that a use of some kind of markdown for comments, code folding etc is needed.

**The thing is that I did minimal testing while I was prototyping functions, but when it was done, I just deleted basically unfinished tests. And that is my mistake.**

I guess in future something like org mode will become more popular, so that you would be able to write text with some markup, while also being able to execute code and fold it all how you want.


## solving solved problem (reinventing wheel)

I knew about this, it is not easy to find unsolved problem i think (if it can be solved that is).

because I thought that this is a simple project just to start, that would take two weeks maximum, i thought that it's fine that this is a solved problem.

However after all the time, i ve spent on this, I can tell you that it is vital for your motivation to not reinvent wheel, since nobody needs another wheel.

**you should work on something that people need**.


## not using webrtc library

WebRTC is horrible to work with, it is horrible to debug. But reason why I use it without any library is simply because literally nothing worked, and I was trying to find out why.


## not using git

git stores changes and they could be inspected and rated.
It is a huge pile of code that could be reviewed, which would show how I made choices and what I changed.

What I used instead of git is just copy directory, make changes and if it goes wrong rename current folder and rename copy to be working directory.

Advantage is that I can inspect and even run both at same time.
It is very easy and very messy.


## not focusing on accessibility

honestly it is not clear how to make something like this accessible.


## no internationalization

Should be easy to add, but might take time to translate.

I strongly believe that this should be done only when project is ready for release, because I changed text many times during development, it would have been a huge waste of time if I also translated it.

I guess visual design should be adapted to be ready for rtl and other language differences, like chinese symbols should be bigger but would take much less width for same text. Dates are also tricky, some countries have different year for example, or horrible ideas like **mm dd yy** instead of **dd mm yy**.
using **dd mmm(month as 3 letters like jul) yyyy** should be understandable for everyone i think.

I know that you should not concatenate words when doing i18n, whole frase should be translated.


## feature procrastination

When core is not working fully, do not work on features.

The objective is to make core working, without it there is no need for features, there is a significant chance that design of feature will become obsolete or incompatible.

examples:


### focusing on secondary tasks instead of primary

doing stuff like text input as alternative for clicking, or adding settings that uses localStorage to change colors of pieces and board. Those things aren't in this project even because I did them in previous version. They can probably be moved here with small changes, but the point is that I made them before I made working game with webrtc.


## premature optimization

performance is extremely complex.

I can understand that a solution that requires 1000 squares computed to compute moves of king is not great, but is it too bad? I don't know.

is a solution that i came up with better? i don't know.

is this solution more complex? absolutely, many times more complex.

I ve spent a bit of time on researching transducers and generator functions, which probably have too much performance cost to be used here.
for example in cases like finding if there is at least one move for the current side (in code now I look for all moves of a piece at square, while I could stop as soon as I found one).
I wouldn't call such experience a mistake, it's nice to know that there are tools like this and that they could be used, but I ended up not using them here after all (I had small versions where I tryed both).


### real performance problem? wasm it

not to mention there are whole chess engines designed for performance, in languages faster than javascript and by people of much higher skill.


### how to figure out performance requirements?

Different architecture, different os, different engine, all of the above can be different version.

Any kind of phone can in theory run it, and what should be the target that requirements would be based off?

To solve this problem you need a real research which might be more complex than the software itself.


### using typed arrays for state that should be transferred

given that I decided to use json, it still could be used with a special function. But is there really a benefit to using typed arrays, that big so that it justifies using it?


## learning new things on already existing code base

This happened several times, a new concept has to be learned with simple examples, too many things get in the way when you have so much code with so much complexity, that isn't necessary to figure out how some new thing works.


## looking for a problem in a wrong place

examples:


### firewall opensuse

I guess other firewalls as well might block webrtc. I was surprised that it blocked even me trying to connect to myself.


### firefox webrtc timer

I liked webrtc dev tools in chromium much more.


### firefox localhost


## file structure

It is easier to use one file, easier to refactor. But there is need to create a function module to show that this code is used for that. With multiple files, each one is small and is easier to reason about in isolation, and for readability is better.

But it is a question when to move code to it's own file?
Should there be a folder for hooks?
How many react components should be in one file?


## naming

This is indeed very difficult task.

examples:


### problem: order of arguments

ramda has some conventions for this but I do not follow them.
not exactly naming problem but related certainly.
easy solution is to use object.

alphanumberic could be used, but if renamed you would have to change order, that is bad.

no order is not an option because it leads to inconsistency.

kinds of things that may decide order:
importance, order of use, size.

like a function that retrieves from nested object where key is color and square.

so in function argument color should be before square, as it will be used obj[color][square]
and the obj in this case would be first argument.


### problem: name collisions of types and components

Both use PascalCase


### hungarian (apps) notation

some names become strange, but more importantly few people use it.

there is an advantage in inspecting objects, because properties named with hungarian notation would start with same letters if they are same kind of thing, like all the squares like en passant, castling origin, castling target etc all would be conveniently grouped together.


### problem: too long names

I thought shortening is fine, but it would require some kind of vocabulary that would have to be maintained, and what's more it would have to be found by unfamiliar person, that doesn't know about existance of such vocabulary.

Downside is that I have variables with names of 30+ characters. It is more difficult to tell what code does when only one name takes whole line.


### problem: name conflicts with structure/shape of object

example:
first has to be indexed with color or empty square and only then piece, while the last is indexed with the figure, no color needed.

    const PIECE_TO_FIGURE = { // indexed with [color/(empty square)][piece]
        [EMPTY_SQUARE]: {
          [EMPTY_SQUARE]: '',
        },
        [WHITE]: {
          [ROOK]: '♖',
          [KNIGHT]: '♘',
          [BISHOP]: '♗',
          [QUEEN]: '♕',
          [KING]: '♔',
          [PAWN]: '♙',
        },
        [BLACK]: {
          [ROOK]: '♜',
          [KNIGHT]: '♞',
          [BISHOP]: '♝',
          [QUEEN]: '♛',
          [KING]: '♚',
          [PAWN]: '♟',
        },
    };

    const FIGURE_TO_PIECE = { // indexed with [figure]
        '♖': ROOK,
        '♜': ROOK,
        '♘': KNIGHT,
        '♞': KNIGHT,
        '♗': BISHOP,
        '♝': BISHOP,
        '♕': QUEEN,
        '♛': QUEEN,
        '♔': KING,
        '♚': KING,
    };

1.  Why it is a bad idea to include structure into name

    This doesn't scale well, and doesn't help much understanding what it represents, it however explains greatly how it is represented, which is already done in the code.

    a problem is that for something like pins, a decent name would be squaresPinned, but problem is that it is not array or object of squares, it is an object of color and then object of squares.


### using cryptic numbers to define actual things

port 443, error 404, what do they tell you? If you don't know you cannot tell.
what piece is 3? Honestly even I don't know, to find out I have to literally find definition in code (its pawn).

I guess it could partially be solved by using some logic, like sorting pieces alphabetically and assigning each a number based on that.
Still insane solution since I d have to sort all pieces each time, and finding definition is easier.

However whats even easier is to just use letters, or even entire words.

The stupid numbers in cases above are used probably to save space, so that less information would have to be transferred, I wonder if people regret such choice now, maybe not.

But in my case, only excuse I have is that in case of colors its convenient to compute direction for pawns, and that originally I was using typed arrays to store colors and pieces. However i don't know a way to type a typed array that has only certain numbers.
And another problem is that I use json to transfer state between players, and it would require a special function to work around typed arrays, so it is just easier to use normal array.

In the code it is not a problem since i use variables, however when i inspect state in browser it all becomes unreadable bunch of numbers.


## bad planning

This is mainly because I overestimated my knowledge of chess, underestimated it's complexity and also kept including new requirements and learning new things.

examples:


### no design (visual)

I was too busy with core and webrtc so visuals is the last thing I did, and the least amount of time spent.

There needs to be some kind of sketch, what I created is extremely different from what I imagined when I started.


### building bottom up

tl:dr
you need to know requirements before you build

the problem is that it doesn't scale.
I started with move generation, using very simple logic, but then figured out complications like pins, and requirement to see if king is in attack to validate every move.
So given new requirement, i came up with a way to find position of king and from king's square compute moves of all pieces to see if those squares would have a piece that could make such move, for example if from king's square a horse move found an enemy horse then king is in check by horse.
This worked mostly, except for the case of moves of king himself for which position of king would change and would require many moves to be computed (around 1k squares) and at the time I considered that to be inefficient.
So a new requirement was added. much later I found out about outrageous end game condition of dead position, where to see if the game is ended you need to find out if checkmate is possible in future, which is simply insane, and would require best engineering to be efficient. such requirement obviously is not adequate for a first project, had I known such requirement in the first place I d never touch chess, in fact online chess websites often dont even try to compute this.


## anti collocation / keeping related stuff separately

why is it bad?

-   not visible in one place
-   change in one place requires change in other place

examples:


### writing notes about code in readme

it has advantages like use of bold italics etc. so it is better suited to convey text.

**Very big disadvantage is that you need to remember about it when you change code**


### keeping css in it's own file as opposed to css inside components

-   you have to match class names in css file and in component file
-   change of component might require change in css file
-   could in theory solve issue that bem solves

stylex was released somewhat recently, there is still an open issue about vite plugin, where some plugins are mentioned.
I don't know how would it work with css variables.


## gameState

It is difficult to do right.

Deciding what should be in gameState, and how is it represented, is there a need for two boards for color and for piece or store piece and color encoded somehow and decode it each time as needed.

Should boards be objects instead of arrays? Originally I used typed arrays, but I decided that it's not worth it.

### not used in rendering but required for update

epds for example are required to decide if it is 3fold repetition.

### two kinds of state

one is highlight state, it is individual to each user and has stuff like playerColor, moves, originSquare.
The other is state of game like currentColor, moveHistory and other stuff.


### temp props of gameState in undo functions / Internal state visible

It is important distinction, but I didn't think about this whole temporary props thing.

Like castling squares are actually also temporary in update functions, they are always null when game is rendered and are set only during updates, similar with placed piece.


## rewrite.tsx

Guess this is a consequence of not using git.

I needed somehow to show unfinished work.
I decided that it is better to keep all stuff in one file, one folder would also work I guess like /rewrite/hooks/useWebSocket.ts etc...

Idk if it is bad that rewrite is not compatible, making it fully compatible would require additional code that doesn't do much.

An advantage is that you can see both in action easily.

# debatable
## not using default export (when only one export)

I don't like it, if I decide to export something else as well, I would have to change all the imports everywhere. With typescript there is a good possibility that you would export types as well.

I don't see benefits, but disadvantage is clear.

## showing errors (webrtc and websocket)

This whole webrtc thing is very complicated, not sure if it helps, but I thought it is better to inform that something went wrong.


## showing important messages at the top

Usually modal is used for this, but it would obscure the board, which must be seen when taking promotion, or deciding if draw should be taken or not.


## not storing hooks with components in same folder

Should hooks be in their own folder?
Not sure how to store components, which work only with hooks. like hook to create websocket, and component to show errors of websocket.


## grouping several components into same file

Certainly it is difficult to decide how many components per file is ok, one per file is a simple solution to this problem but at what cost.

There is also need to group some components together like the ones that go inside svg.

## creating types for props of object like {key: Key}

This got me into collision with components.

also this leads to strange types like:
type SomeProp = string
convenient because i know how type of prop is called, but maybe it is too much.

Alternative is to type object and then use Pick.
Advantage is that there is less stuff to import.


## using ramda

I needed some kind of utility library, ramda works fine, not sure about performance, but it is likely not big impact.

I didn't follow ramda's convention for arguments order.

There is an inconvenience with typescript certainly.

## not using typescript 100%

There are many errors, many "as" casts, many not null assertions, many ignore comments, not all functions have typed arguments.

### ramda

pipe requires passing types, and overall typescript doesn't infer well with ramda.

### inferance is not smart enough

type Color is 1 or -1.

get a variable of such type and multiply it by -1. the result is number instead of Color. Where in fact it is Color.


## using svg

it was easy to make it work with react, and it is scalable, kind of. svg supports css variables, and can be styled with css if it is an svg that is created with svg tag.

There is an issue with gaps between two squares that are drawn exactly next to each other, can be visible on certain zoom levels.

Not sure about performance, I guess it is worse than canvas.

How I used svg is more questionable, not putting handlers on svg elements, but on buttons instead that are positioned on top of svg. Or how rotation of board is done.


## expanding requirements

Initially I wanted a simple game, then I questioned performance and done this design, then I wanted it to be multiplayer, then webrtc.


## not using es6 Map and Set

I questioned this many times.

advantages that I need:

-   map has any type as key (I need number instead of string)
-   set is a set (for my use case I can emulate it with object of key: true)
-   size is useful

disadvantages:

-   no literals (bad but I can manage)
-   no json (for my case it could be fixed easily)
-   map is only ordered and order is based on insertion
    this is actually very bad for current testing setup because it would mess up equality, or would require converting map to array and sorting it, or providing a replacement comparator.
-   unreasonable bare bones methods, no set functions.
-   many libraries do not support.
-   no clear way how to use functionally.
    sure you can use it in functional style by creating a copy and mutating it, but you basically have to recreate many methods as functions, and I haven't seen a library that did this.

I am certain that using Map or Set internally is fine, but using it for state is bad idea in my case.


## using arrow instead of function

I actually like function keyword more, but it also has all the old stuff like hoisting and `this`.

Using arrow clearly shows that such things wont be used.

However linter fix converts all to function.

# good


## keeping server and client side as separate projects

debatable but, each is a project, and each requires it's own tooling, and each could be replaced with some other implementation.

maybe core and frontend should be separated as well.


### separating all logic from react

basically it all must work without react, even handlers.


## coming up with my own design (reinventing wheel)

The other side of reinventing wheel is that you learn how to build stuff.


## functional programming

Not sure if it is better for something like chess, but I like referential transparency.
I do not include **monads** and **point free** into this.

Given that I used javascript, there is real performance price for copying and creating all the functions that return functions like in currying. Javascript itself is not very convenient, no naming convention to tell which method mutates and which returns copy, only recently toReversed() and other stuff appeared, many things just don't expect fp to be used.


## p2p (webrtc)

I think p2p is nice concept and is very good for 1v1 game (given that I decided not to solve cheating problem).


## acknowledgement, idempotence

It's nice that I learned about this things, but I didn't implement them for websocket, only for webrtc.

## sending action instead of entire state

State can grow, action is always small.

It is also possible to accumulate actions into one, and send one instead of all.
Is there need for such optimization? I don't think it is worth it.
But if it is to be done, then it should be done only to actions that aren't being sent right now (all except first element). because first action could have been delivered already.

## using typescript

I do not like it, it sure feels like something that is made by same people that made old javascript, nasty stuff.

but it is popular and allows to describe many things.

And that is what I needed, a way to describe what function takes and returns.
That is the only reason why I use it. I do not like 'type safety', there are too many places where I know that code is right yet typescript complains, and there are too many 'as' used. Furthermore the amount of ceremonies required to make typescript stop complaining is daunting, and doesn't give me much.


## using prettier, eslint, vite


## useReducer instead of useState for gameState

useReducer allows convenient grouping of code that deals with state, and it is easier to read when u call dispatch with action, than to read 30 chars long name of handler function.

The reducer can also be used in testing.


## this file

I am not sure that this is the right way to group decisions, and my evaluation of my decisions is very subjective, but grouping them all in one place is a good idea.

