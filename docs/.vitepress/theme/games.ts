// The collection. One entry per reimplementation; the home page, the collection page and every game page
// read from here, so adding a game is one entry plus docs/games/<slug>.md.

export type Status = "playable" | "in-progress" | "groundwork";

export interface Shot {
  file: string; // under /shots/<slug>/
  caption?: string;
}

export interface Game {
  slug: string; // also the docs/games/<slug>.md page and the /shots/<slug>/ folder
  project: string; // repository / project name
  title: string;
  year: number;
  studio: string;
  publisher: string;
  original: string; // original platform/tech, short
  approach: string;
  status: Status;
  statusNote: string;
  version?: string; // latest release tag
  site: string;
  repo: string;
  play?: string;
  data: string; // what the player must bring
  blurb: string;
  cover?: string; // file in /shots/<slug>/
  alt?: string; // second image, shown on hover
  emblem?: string; // used when a project publishes no screenshots
  noShots?: string; // why there is no gallery
  shots: Shot[];
}

const gh = (p: string) => `https://github.com/emdzej/${p}`;
const site = (p: string) => `https://${p}.emdzej.pl`;

export const games: Game[] = [
  {
    slug: "rf",
    project: "OpenRF",
    title: "Return Fire",
    year: 1996,
    studio: "Silent Software",
    publisher: "Prolific Publishing",
    original: "Windows 95 · DirectDraw 8-bit · DirectSound · Cinepak",
    approach: "Function-by-function port",
    status: "playable",
    statusNote: "Whole game, one and two players",
    version: "0.4.0",
    site: site("openrf"),
    repo: gh("openrf"),
    play: `${site("openrf")}/play/`,
    data: "Your Return Fire Windows 95 CD (folder, .iso or raw .bin)",
    blurb:
      "Capture the flag with tanks, helicopters, jeeps and an armoured support vehicle, to a soundtrack of classical music. Ported from RFIRE.BIN with its 16.16 fixed-point maths intact.",
    cover: "heli.png",
    alt: "2p-drive.png",
    shots: [
      { file: "title.png", caption: "Title screen" },
      { file: "select.png", caption: "Choosing a vehicle in the bunker" },
      { file: "lift.png", caption: "The lift brings the vehicle up" },
      { file: "heli.png", caption: "Helicopter over the island" },
      { file: "tank-fire.png", caption: "Tank firing" },
      { file: "jeep.png", caption: "The jeep, the only one that can carry the flag" },
      { file: "msv.png", caption: "Armoured support vehicle laying mines" },
      { file: "drive.png", caption: "Driving" },
      { file: "turret.png", caption: "Turrets defending the base" },
      { file: "drone.png", caption: "The drone" },
      { file: "sub.png", caption: "The submarine" },
      { file: "2p-select.png", caption: "Two players: split-screen selection" },
      { file: "2p-drive.png", caption: "Two players: split screen" },
      { file: "2p-heli.png", caption: "Two players: helicopter" },
      { file: "2p-spectate.png", caption: "Two players: spectating" },
      { file: "rules.png", caption: "Rules" },
      { file: "win.png", caption: "Victory" },
      { file: "intro-logo.png", caption: "Intro" },
    ],
  },
  {
    slug: "gta",
    project: "OpenGTA",
    title: "Grand Theft Auto",
    year: 1997,
    studio: "DMA Design",
    publisher: "BMG Interactive",
    original: "Windows · SciTech MGL / DirectDraw · Miles Sound System · Smacker",
    approach: "Function-by-function port",
    status: "playable",
    statusNote: "All single-player systems, three cities",
    version: "0.2.0",
    site: site("opengta"),
    repo: gh("opengta"),
    play: `${site("opengta")}/play/`,
    data: "Rockstar's 2002 re-release (installed folder or the unzipped installer)",
    blurb:
      "Liberty City, San Andreas and Vice City from above, with DMA's own software rasteriser ported line by line, plus opt-in hi-res rendering that never touches the game state.",
    cover: "city-nyc.jpg",
    alt: "mission-miami.jpg",
    shots: [
      { file: "intro.jpg", caption: "Intro" },
      { file: "menu.jpg", caption: "Main menu" },
      { file: "players.jpg", caption: "Choosing a player" },
      { file: "cities.jpg", caption: "Choosing a city" },
      { file: "options.jpg", caption: "Options" },
      { file: "mission1.jpg", caption: "The first mission" },
      { file: "driving.jpg", caption: "Driving" },
      { file: "city-nyc.jpg", caption: "Liberty City" },
      { file: "city-sanb.jpg", caption: "San Andreas" },
      { file: "city-miami.jpg", caption: "Vice City" },
      { file: "mission-sanb.jpg", caption: "A mission in San Andreas" },
      { file: "mission-miami.jpg", caption: "A mission in Vice City" },
      { file: "credits.jpg", caption: "Credits" },
    ],
  },
  {
    slug: "i76",
    project: "OpenI76",
    title: "Interstate '76",
    year: 1997,
    studio: "Activision",
    publisher: "Activision",
    original: "Windows · software renderer to 8-bit DirectDraw · CD audio soundtrack",
    approach: "Function-by-function port",
    status: "in-progress",
    statusNote: "Four missions won end to end; the rest not yet played through",
    site: site("openi76"),
    repo: gh("openi76"),
    data: "Your Interstate '76 CDs, version 1.0",
    cover: "06-t03-canyon.webp",
    alt: "03-t01-cockpit.webp",
    blurb:
      "Vehicular combat in an alternate 1970s American Southwest. The 8-bit renderer, vehicle physics, AI, weapons, effects, sound, mission scripts and the shell are ported, with the renderer diffed against I76.EXE in an emulator; the first four missions play to a win.",
    shots: [
      { file: "01-main-menu.webp", caption: "The shell's main menu (I76SHELL.DLL's front end, ported)" },
      { file: "02-t01-chase.webp", caption: "Mission t01: Groove's Picard Piranha in the chase camera (F3), terrain, road and sky" },
      { file: "03-t01-cockpit.webp", caption: "t01 from the 3D cockpit: radar, weapons panel, damage diagram, mirror and gear selector, following Taurus" },
      { file: "04-t01-pursuit.webp", caption: "t01 under the port's autopilot (the ported AI driving the user's car), chasing a car down the highway" },
      { file: "05-t01-base.webp", caption: "Later in t01: ammunition spent on the way to the objective, structures on the horizon" },
      { file: "06-t03-canyon.webp", caption: "Mission t03 at dusk: canyon terrain and a winding road" },
      { file: "07-a01-training.webp", caption: "The training mission a01: desert road, cacti and mountains" },
      { file: "08-s07-desert.webp", caption: "Mission s07: open desert under a teal sky, with the car's shadow" },
    ],
  },
  {
    slug: "cmr2",
    project: "OpenCMR2",
    title: "Colin McRae Rally 2.0",
    year: 2000,
    studio: "Codemasters",
    publisher: "Codemasters",
    original: "Windows · Direct3D 7 · DirectPlay · Bink",
    approach: "Function-by-function port",
    status: "playable",
    statusNote: "Whole offline game; network play in testing",
    version: "0.1.4",
    site: site("opencmr2"),
    repo: gh("opencmr2"),
    play: `${site("opencmr2")}/play/`,
    data: "Your Colin McRae Rally 2.0 CD",
    blurb:
      "Rallies, arcade, time trials and two-player, from the start-up movies to the end of a championship, drawn through OpenGL ES with optional widescreen.",
    cover: "wide-stage.jpg",
    alt: "demo-2.jpg",
    shots: [
      { file: "menu.jpg", caption: "Main menu" },
      { file: "service.jpg", caption: "Service area" },
      { file: "stage-start.jpg", caption: "Stage start" },
      { file: "start-lights.jpg", caption: "Start lights" },
      { file: "demo-1.jpg", caption: "Attract demo" },
      { file: "demo-2.jpg", caption: "Attract demo" },
      { file: "demo-3.jpg", caption: "Attract demo" },
      { file: "wide-stage.jpg", caption: "Widescreen stage" },
      { file: "wide-demo.jpg", caption: "Widescreen demo" },
    ],
  },
  {
    slug: "nfspu",
    project: "OpenNFSPU",
    title: "Need for Speed: Porsche Unleashed",
    year: 2000,
    studio: "EA Canada",
    publisher: "Electronic Arts",
    original: "Windows · Direct3D 7 via EA THRASH · Porsche.exe v3.5",
    approach: "Function-by-function port",
    status: "playable",
    statusNote: "Single player and multiplayer; work paused",
    version: "0.1.9",
    site: site("opennfspu"),
    repo: gh("opennfspu"),
    play: `${site("opennfspu")}/play/`,
    data: "The installed game, updated to version 3.5",
    blurb:
      "Quick Race, knockouts, the Evolution career and Factory Driver, with AI, traffic, police and replays. Adds true 16:9 and 16:10, and saves that move between browser and desktop.",
    cover: "alps-wide.jpg",
    alt: "cockpit.jpg",
    shots: [
      { file: "menu.jpg", caption: "Main menu" },
      { file: "quickrace.jpg", caption: "Quick Race" },
      { file: "alps.jpg", caption: "The Alps" },
      { file: "alps-wide.jpg", caption: "The Alps, widescreen" },
      { file: "canyon.jpg", caption: "Canyon" },
      { file: "castle.jpg", caption: "Castle" },
      { file: "cockpit.jpg", caption: "Cockpit view" },
    ],
  },
  {
    slug: "sheep",
    project: "OpenSheep",
    title: "Sheep",
    year: 2000,
    studio: "Mind's Eye Productions",
    publisher: "Empire Interactive",
    original: "Windows · DirectDraw 16-bit · DirectSound · Bink",
    approach: "Function-by-function port",
    status: "playable",
    statusNote: "All 35 levels ported; full play-through pending",
    site: site("opensheep"),
    repo: gh("opensheep"),
    play: `${site("opensheep")}/play/`,
    data: "Your Sheep CD for Windows",
    blurb:
      "Herd a flock to its pen by where you stand, across six worlds of farms, castles and outer space. Ported in about 29 hours of agent time.",
    cover: "farm.jpg",
    alt: "space.jpg",
    shots: [
      { file: "world-intro.jpg", caption: "World intro" },
      { file: "menu.jpg", caption: "Main menu" },
      { file: "herders.jpg", caption: "Choosing a shepherd" },
      { file: "level-select.jpg", caption: "Level select" },
      { file: "training.jpg", caption: "Training" },
      { file: "farm.jpg", caption: "The farm" },
      { file: "castle.jpg", caption: "The castle" },
      { file: "desert.jpg", caption: "The desert" },
      { file: "city.jpg", caption: "The city" },
      { file: "space.jpg", caption: "Space" },
      { file: "space-asteroids.jpg", caption: "Asteroids" },
      { file: "pink.jpg", caption: "World 4" },
      { file: "dodgems.jpg", caption: "Bonus game: dodgems" },
      { file: "race-cars.jpg", caption: "Bonus game: kart race" },
      { file: "sack-race.jpg", caption: "Bonus game: sack race" },
      { file: "pause.jpg", caption: "Pause" },
      { file: "final.jpg", caption: "The final level" },
    ],
  },
  {
    slug: "oni",
    project: "OpenOni",
    title: "Oni",
    year: 2001,
    studio: "Bungie West",
    publisher: "Gathering of Developers",
    original: "Windows · OpenGL 1.1 · DirectSound · Bink",
    approach: "Function-by-function port",
    status: "in-progress",
    statusNote: "All 14 levels play through; cheat-free runs still being verified",
    site: site("openoni"),
    repo: gh("openoni"),
    play: `${site("openoni")}/play/`,
    data: "The original Windows US CD (ISO or its files), or an installed Oni",
    blurb:
      "Konoko's third-person action, ported from the v1.0 Windows exe, with Bungie's own function names recovered from a later Mac build. It plays straight from the installer archive on the CD.",
    cover: "05-melee.webp",
    alt: "03-level1.webp",
    shots: [
      { file: "01-intro.webp", caption: "The intro movie, played by OpenOni's own Bink decoder (ported from binkw32.dll)" },
      { file: "02-menu.webp", caption: "The main menu, drawn by the ported window manager" },
      { file: "03-level1.webp", caption: "Level 1: Konoko in the warehouse (from a save point)" },
      { file: "04-pistol.webp", caption: "Level 2: a firefight, the pistol's laser sight and crosshair" },
      { file: "05-melee.webp", caption: "Level 3: hand-to-hand, a guard thrown back with the impact effects" },
      { file: "06-chapter.webp", caption: "A level's chapter screen over its environment (Chapter 05, Hot Pursuit)" },
      { file: "07-cutscene.webp", caption: "A cutscene: the letterbox in, the script driving the characters (level 12)" },
      { file: "08-rooftops.webp", caption: "Level 12 (Chapter 10, Cat and Mouse): Konoko meets a guard on the rooftops" },
      { file: "09-level14.webp", caption: "Level 14: running through the facility's corridors" },
    ],
  },
  {
    slug: "ballance",
    project: "OpenBallance",
    title: "Ballance",
    year: 2004,
    studio: "Cyparade",
    publisher: "Atari",
    original: "Windows · Virtools (CK2) · Ipion physics",
    approach: "Script runtime + physics port",
    status: "playable",
    statusNote: "All levels, running the game's own Virtools scripts",
    version: "0.1.3",
    site: site("openballance"),
    repo: gh("openballance"),
    play: `${site("openballance")}/play/`,
    data: "Your Ballance CD or an installed copy",
    blurb:
      "Roll a ball of wood, stone or paper through floating tracks. The game's logic lives in Virtools behaviour graphs, so OpenBallance runs those graphs on a new CK2-compatible runtime with a port of the Ipion physics engine.",
    cover: "level01.jpg",
    alt: "level09.jpg",
    shots: [
      { file: "intro.jpg", caption: "Intro" },
      { file: "menu.jpg", caption: "Main menu" },
      { file: "level-select.jpg", caption: "Level select" },
      { file: "options.jpg", caption: "Options" },
      { file: "tutorial.jpg", caption: "Tutorial" },
      ...[1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12].map((n) => ({
        file: `level${String(n).padStart(2, "0")}.jpg`,
        caption: `Level ${n}`,
      })),
      { file: "level08-extra.jpg", caption: "Level 8" },
      { file: "pause.jpg", caption: "Pause" },
      { file: "game-over.jpg", caption: "Game over" },
      { file: "highscore.jpg", caption: "High scores" },
      { file: "viewer.jpg", caption: "Level viewer" },
    ],
  },
  {
    slug: "bv",
    project: "openbv",
    title: "Babo Violent 2",
    year: 2008,
    studio: "RndLabs",
    publisher: "Freeware; source later released under GPL-3.0",
    original: "Windows · OpenGL 1.x · FMOD · baboNet",
    approach: "Source port",
    status: "playable",
    statusNote: "Client, hosting and a new multiplayer server",
    site: site("openbv"),
    repo: gh("openbv"),
    play: `${site("openbv")}/play/`,
    data: "Nothing: the game content is GPL and comes with it",
    blurb:
      "Top-down multiplayer shooting with balls. The released C++ source is compiled as-is on a new platform layer, with a Go server rewritten from a spec and checked bit-for-bit against the original.",
    cover: "in-game.webp",
    alt: "team-select.webp",
    shots: [
      { file: "menu.webp", caption: "Main menu (redesigned)" },
      { file: "host.webp", caption: "Hosting a game" },
      { file: "team-select.webp", caption: "Team select" },
      { file: "in-game.webp", caption: "In game" },
    ],
  },
];

export const bySlug = (slug: string) => games.find((g) => g.slug === slug);

export const statusLabel: Record<Status, string> = {
  playable: "Playable",
  "in-progress": "In progress",
  groundwork: "Groundwork",
};

// The gasm wing: classics that run on gasm as ports of existing open engines rather than ENCORE
// reimplementations. They live in the gasm repository itself.
export interface WingItem {
  title: string;
  year: number;
  studio: string;
  what: string;
  bring: string;
  play: string;
  source: string;
  image: string;
}

export const gasmWing: WingItem[] = [
  {
    title: "DOOM",
    year: 1993,
    studio: "id Software",
    what: "doomgeneric (from id's released source) with Chocolate Doom's OPL music player and saves in gasm storage.",
    bring: "Any IWAD — the freely distributable shareware doom1.wad, DOOM II, Freedoom",
    play: "https://gasm.emdzej.pl/play/?game=doom.wasm&autostart",
    source: "https://github.com/emdzej/gasm/tree/main/guests/doom",
    image: "/shots/gasm/doom.webp",
  },
  {
    title: "ScummVM",
    year: 2001,
    studio: "The ScummVM team",
    what: "The reimplementation of the engines behind LucasArts' SCUMM adventures, Humongous games, Beneath a Steel Sky, Drascula and many more, with a gasm backend.",
    bring: "Your own adventure games; Beneath a Steel Sky (freeware) is in the demo",
    play: "https://gasm.emdzej.pl/play/?game=scummvm.wasm&autostart",
    source: "https://github.com/emdzej/gasm/tree/main/guests/scummvm",
    image: "/shots/gasm/sky.webp",
  },
];
