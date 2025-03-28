import Game from "../models/game.module.js"
import Prediction from "../models/prediction.module.js"
import Team from "../models/team.module.js"
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