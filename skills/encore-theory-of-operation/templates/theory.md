# How <Game> works

A theory of operation of <Game> (<Studio>, <year>): how the game is built, from the frame loop to the
<missions/races/levels>. It comes from porting the <platform> executable function by function. It is meant for
anyone who wants to learn how a <genre> of its time is put together. The details, with the exe's addresses and
layouts, are in the repository's reverse-engineering notes (`docs/re`) and in the format pages of this site.

## The shape of the program

<Language, size, the subsystems/modules and what each is for (table). Start-up, the main loops and how they
nest, memory.>

## Time

<Tick rate, how elapsed time becomes ticks, what is drawn when, random number generators and who uses them,
why the game is deterministic.>

## The data

<How files are found and loaded: archives, indexes, templates/instances. What is data and what is code, and
why.>

## The world

<Levels, terrain/rooms/roads, the spatial structure for collisions and visibility, objects and triggers.>

## The gameplay

### <The player / vehicles / characters>
### <Movement and physics>
### <Combat, weapons and damage>
### <The AI>
<Layers: perception, decisions, actions. How it uses the same interface as the player, if it does.>
### <Missions and scripting>
<The script machine, its commands, how a mission is assembled: zones, paths, spawn points, objectives.>

## Saving

<What a save holds and what it leaves out.>

## Presentation

<Renderer, HUD, menus, sound and music, movies.>

## Lessons for building such a game

- **<Idea>.** <One or two sentences.>

## Further reading

- <Format pages, docs/re pages, outside sources.>
