import { Router } from "express";
import { delete_, get, post, put } from "../utils/routerHandler";

import { getPlayers } from "../endpoints/players/getPlayers";
import { postCreatePlayer } from "../endpoints/players/postCreatePlayer";
import { putUpdatePlayer } from "../endpoints/players/putUpdatePlayer";
import { deletePlayer } from "../endpoints/players/deletePlayer";

import { postCreateGame as postCreateAtwGame } from "../endpoints/atw/postCreateGame";
import { postAddParticipant as postAddAtwParticipant } from "../endpoints/atw/postAddParticipant";
import { postThrow as postAtwThrow } from "../endpoints/atw/postThrow";
import { postFinaleScore } from "../endpoints/atw/postFinaleScore";
import { postUndo as postUndoAtw } from "../endpoints/atw/postUndo";
import { putSwapOrder } from "../endpoints/atw/putSwapOrder";
import { getGame as getAtwGame } from "../endpoints/atw/getGame";
import { getActiveGame as getAtwActiveGame } from "../endpoints/atw/getActiveGame";
import { getGames as getAtwGames } from "../endpoints/atw/getGames";
import { deleteGame as deleteAtwGame } from "../endpoints/atw/deleteGame";

import { postCreateGame as postCreateCricketGame } from "../endpoints/cricket/postCreateGame";
import { postThrow as postCricketThrow } from "../endpoints/cricket/postThrow";
import { putReorder as putReorderCricket } from "../endpoints/cricket/putReorder";
import { postUndo as postUndoCricket } from "../endpoints/cricket/postUndo";
import { getGame as getCricketGame } from "../endpoints/cricket/getGame";
import { getActiveGame as getCricketActiveGame } from "../endpoints/cricket/getActiveGame";
import { getGames as getCricketGames } from "../endpoints/cricket/getGames";
import { deleteGame as deleteCricketGame } from "../endpoints/cricket/deleteGame";

import { postCreateGame as postCreateX01Game } from "../endpoints/x01/postCreateGame";
import { postTurn as postX01Turn } from "../endpoints/x01/postTurn";
import { putReorder as putReorderX01 } from "../endpoints/x01/putReorder";
import { postUndo as postUndoX01 } from "../endpoints/x01/postUndo";
import { getGame as getX01Game } from "../endpoints/x01/getGame";
import { getActiveGame as getX01ActiveGame } from "../endpoints/x01/getActiveGame";
import { getGames as getX01Games } from "../endpoints/x01/getGames";
import { deleteGame as deleteX01Game } from "../endpoints/x01/deleteGame";

import { getAllStats } from "../endpoints/stats/getAllStats";
import { getStatsTotals } from "../endpoints/stats/getStatsTotals";
import { getPlayerStats } from "../endpoints/stats/getPlayerStats";
import { postCompare } from "../endpoints/stats/postCompare";

const r = Router();

// Players
get(r, "/players", getPlayers);
post(r, "/players", postCreatePlayer);
put(r, "/players", putUpdatePlayer);
delete_(r, "/players", deletePlayer);

// Around the World
post(r, "/atw/games", postCreateAtwGame);
post(r, "/atw/games/participants", postAddAtwParticipant);
post(r, "/atw/games/throw", postAtwThrow);
post(r, "/atw/games/finale-score", postFinaleScore);
post(r, "/atw/games/undo", postUndoAtw);
put(r, "/atw/games/order", putSwapOrder);
get(r, "/atw/games/active", getAtwActiveGame);
get(r, "/atw/games/:id", getAtwGame);
get(r, "/atw/games", getAtwGames);
delete_(r, "/atw/games", deleteAtwGame);

// Cricket
post(r, "/cricket/games", postCreateCricketGame);
post(r, "/cricket/games/throw", postCricketThrow);
post(r, "/cricket/games/undo", postUndoCricket);
put(r, "/cricket/games/order", putReorderCricket);
get(r, "/cricket/games/active", getCricketActiveGame);
get(r, "/cricket/games/:id", getCricketGame);
get(r, "/cricket/games", getCricketGames);
delete_(r, "/cricket/games", deleteCricketGame);

// X01
post(r, "/x01/games", postCreateX01Game);
post(r, "/x01/games/turn", postX01Turn);
post(r, "/x01/games/undo", postUndoX01);
put(r, "/x01/games/order", putReorderX01);
get(r, "/x01/games/active", getX01ActiveGame);
get(r, "/x01/games/:id", getX01Game);
get(r, "/x01/games", getX01Games);
delete_(r, "/x01/games", deleteX01Game);

// Stats
get(r, "/stats", getAllStats);
get(r, "/stats/totals", getStatsTotals);
get(r, "/stats/:id", getPlayerStats);
post(r, "/stats/compare", postCompare);

export default r;