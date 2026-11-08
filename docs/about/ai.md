---
title: On AI
---

# On AI, and the decomp scene

[The Verge recently asked](https://www.theverge.com/ai-artificial-intelligence/1015430/ai-retro-games-decomp-recomp-port)
whether AI is tearing retro game preservation apart. Part of the answer is yes, and the people saying so are
right. A port nobody understands is not preservation. A fork that "finishes" someone else's decompilation with
an agent and takes the credit is not preservation either. The community that tracked decomp projects closing its
doors over exactly that should worry everyone who cares about old games.

We use coding agents heavily. [Sheep](/games/sheep) took about 29 hours of agent time, [Oni](/games/oni) six
days. Those are the spans of the commit histories — the human time spent choosing the game, steering the work,
reviewing it and playing it is not in them. Either way, it is fast, so we owe an account of how we try to do it
properly.

## Mixed feelings

We all have mixed feelings about AI. Some say it is stealing: the models were trained on other people's work,
often without their consent. That is true. No doubt about it. And yet — it is here, and it makes things that
were not possible, possible. For us it is hard to stand on one side of the barricade.

It is a powerful tool, and we use it to do the best we can with it, technically and morally.

Often someone's best skill is having great ideas, and AI lets them bring those ideas to life. Jobs needed
Wozniak; Wozniak needed Jobs.

Would it be better if ten people worked on something for a year, rather than one person equipped with agents for
a month? Maybe. Maybe not.

## Understanding is the product

The point of taking a game apart is to learn how it works, and to write that down. Every ported function cites
its address in the original program. Every function name is recorded with how confident we are in it. Every
file format is documented from the program's own reader, with what is confirmed and what is inferred. Commit
messages name the original function and say what went wrong. The [guides](/guides/) and
[agent skills](/skills/) on this site exist so that the next person — or the next agent — learns why, not just
what. And every port ends with a theory of operation — a document that explains how the game was designed and how
it works, from the frame loop to the AI and the missions, for anyone who wants to learn how to build such a game.
The first is [How Oni works](https://openoni.emdzej.pl/guide/theory). If an agent wrote it and nobody can
explain it, it is not done.

## Credit where it is due

We build from the original programs, never by forking someone else's decompilation. But we do lean on what
communities have published over the years — format wikis, modding documentation, other builds of a game that
carry its function names, reference decoders — and every game page lists those sources under
"Standing on shoulders". If you find a gap in our credits, [tell us](https://github.com/emdzej/encore/issues)
and we will fix it.

## "It runs" is not "it is faithful"

Every port is verified with deterministic hashes of its video and audio, identical on every platform. Three of
them go further and run the original program's own machine code side by side with the port, comparing results
word for word. And every project's status page says plainly what has not been compared with the original yet —
Sheep has not been played through end to end; Oni's full run has so far been checked only with the game's own cheats on.

## Neighbours first

If a game already has a community working on it, we would rather help than race. Before we start, we look for
existing projects; if one is active, we get in touch and offer what we have — format findings, tools, tests —
instead of starting a competing port.

## Is it a losing battle?

We don't think so. Faster tools can produce slop, or they can produce more documentation, more checks and more
games kept alive. Which one you get is a choice, and these are ours.
