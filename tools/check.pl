% Reads each file named on the command line term by term, as SWI-Prolog's reader does,
% and prints `ok File Terms` or `error File: Message`; exits 1 if any file has a syntax error.
%
%     swipl tools/check.pl -- FILE...
%
% The `--` matters: without it, swipl loads (and so runs) every FILE ending in .pl.
%
% The files are not loaded and nothing in them is run. Only their operator declarations,
% `:- op/3` directives and op/3 terms in `:- module/2` export lists, are applied (to a
% temporary module per file), because reading the rest of the file depends on them.
% Quasi-quotations are read but not passed to their syntax's parser.

:- initialization(main, main).

main(Files) :-
    foldl(check, Files, 0, Status),
    halt(Status).

check(File, Status0, Status) :-
    catch(in_temporary_module(M, true, read_file(File, M, Terms)), Error, true),
    (   var(Error)
    ->  format("ok ~w ~d~n", [File, Terms]),
        Status = Status0
    ;   format("error ~w: ~q~n", [File, Error]),
        Status = 1
    ).

read_file(File, M, Terms) :-
    setup_call_cleanup(open(File, read, In, [encoding(utf8)]), read_terms(In, M, 0, Terms), close(In)).

read_terms(In, M, Terms0, Terms) :-
    read_term(In, Term, [syntax_errors(error), module(M), quasi_quotations(_)]),
    (   Term == end_of_file
    ->  Terms = Terms0
    ;   declare_ops(Term, M),
        Terms1 is Terms0 + 1,
        read_terms(In, M, Terms1, Terms)
    ).

declare_ops((:- op(P, T, N)), M) :-
    !,
    op(P, T, M:N).
declare_ops((:- module(_, Exports)), M) :-
    is_list(Exports),
    !,
    forall(member(op(P, T, N), Exports), op(P, T, M:N)).
declare_ops(_, _).
