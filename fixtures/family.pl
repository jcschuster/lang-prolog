% A small program touching most of the syntax.

:- module(family, [parent/2, ancestor/2, op(700, xfx, ===)]).
:- use_module(library(lists)).
:- dynamic visited/1.

/* Facts.
   /* Comments nest. */
*/
parent(tom, bob).
parent(bob, 'Ann Marie').
parent('Ann Marie', "Sue").

ancestor(X, Y) :-
    parent(X, Y).
ancestor(X, Z) :-
    parent(X, Y),
    ancestor(Y, Z).

a === a.

count(L, N) :-
    (   L == []
    ->  N = 0
    ;   L = [_|T],
        count(T, N0),
        N is N0 + 1
    ).

numbers([0'a, 0'', 0'\n, 0x1F, 0o17, 0b101, 16'FF, 1_000_000, 1.5e10, 1.0Inf, 1r3]).

point(P) :- P = point{x: 1, y: 2}, X = P.x, format("~w~n", [X]).

text(`codes`, 'it''s', "say \"hi\"").

greeting --> [hello], name.
name --> [world] | [prolog].

safe(G) :- catch(G, _, fail), \+ visited(G), !.
