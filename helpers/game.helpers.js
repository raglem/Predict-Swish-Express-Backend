import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Player from "../models/player.module.js"
import Prediction from "../models/prediction.module.js"
import Team from "../models/team.module.js"
import { getLeaguePredictions, getLeaguePredictionsStatus } from "./prediction.helpers.js"
export const formatUpcomingGame = async (gameId) => {
    const game = await Game.findById(gameId)
    if(!game){
        return { success: false, message: 'Invalid game object'}
    }
    const away_team = await Team.findById(game.away_team)
    const home_team = await Team.findById(game.home_team)
    const formattedGame = {
        balldontlie_id: game.balldontlie_id,
        date: game.date,
        status: game.status,
        away_team: away_team.name,
        home_team: home_team.name,
    }
    return { success: true, formatted: formattedGame }
}
export const formatRecentGame = async (gameId) => {
    const game = await Game.findById(gameId)
    if(!game){
        return { success: false, message: 'Invalid game object'}
    }
    const away_team = await Team.findById(game.away_team)
    const home_team = await Team.findById(game.home_team)

    const formattedGame = {
        balldontlie_id: game.balldontlie_id,
        date: game.date,
        status: game.status,
        home_team_score: game.home_team_score,
        away_team_score: game.away_team_score,
        away_team: away_team.name,
        home_team: home_team.name,
    }
    return { success: true, formatted: formattedGame }
}
export const formatGameWithPredictionStatus = async (gameId, leagueId) => {
    try{
        const game = await Game.findById(gameId)
        const league = await League.findById(leagueId).select('name')
        if(!game){
            return { success: false, message: 'Invalid game object'}
        }
        const away_team = await Team.findById(game.away_team)
        const home_team = await Team.findById(game.home_team)
        const predictions = await getLeaguePredictionsStatus(gameId, leagueId) // { success, predictions }
        const formattedGame = {
            balldontlie_id: game.balldontlie_id,
            league: league.name,
            date: game.date,
            status: game.status,
            away_team: away_team.name,
            home_team: home_team.name,
            predictions: predictions.success ? predictions.predictions : []
        }
        return { success: true, formatted: formattedGame }
    }
    catch(err){
        console.log(err)
        return { success: false }
    }
}
export const formatGameWithPredictions = async (gameId, leagueId) => {
    try{
        const game = await Game.findById(gameId)
        const league = await League.findById(leagueId).select('name')
        if(!game){
            return { success: false, message: 'Invalid game object'}
        }
        const away_team = await Team.findById(game.away_team)
        const home_team = await Team.findById(game.home_team)
        const predictions = await getLeaguePredictions(gameId, leagueId) // { success, predictions }
        const formattedGame = {
            balldontlie_id: game.balldontlie_id,
            league: league.name,
            date: game.date,
            status: game.status,
            away_team: away_team.name,
            home_team: home_team.name,
            predictions: predictions.success ? predictions.predictions : []
        }
        return { success: true, formatted: formattedGame }
    }
    catch(err){
        return { success: false }
    }
}