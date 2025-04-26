import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Player from "../models/player.module.js"
import Prediction from "../models/prediction.module.js"
import Team from "../models/team.module.js"
import User from "../models/user.module.js"
import { formatUpcomingGame, formatRecentGame } from '../helpers/game.helpers.js'
import { getRanking } from "./prediction.helpers.js"
export const upcomingGames = async leagueId => {
    try{
        let games
        const league = await League.findById(leagueId)

        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 7);
        
        if(!league){
            return { success: false, message: `League with id ${leagueId} not found` }
        }
        if(league.mode === 'classic'){
            games = await Game.find({ 
                date: {
                    $gte: new Date(start), 
                    $lte: new Date(end) 
                }
            }).sort({ balldontlie_id: 1 }).limit(5)
        }
        if(league.mode === 'team'){
            const team = await Team.findById(league.team)
            games = await Game.find({ 
                date: {
                    $gte: new Date(start), 
                    $lte: new Date(end) 
                },
                $or: [{ away_team: team._id }, { home_team: team._id }]
            }).sort({ balldontlie_id: 1}).limit(5)
        }
        games = await Promise.all(games.map(async game => {
            const formattedGame = await formatUpcomingGame(game)
            if(formattedGame.success){
                /*
                    formattedGame = { success, formatted }
                    formattedGame.formatted = {
                        balldontlie_id,
                        date,
                        status,
                        away_team,
                        home_team
                        away_team_score,
                        home_team_score,
                    }
                */
                return formattedGame.formatted
            }
            return null
        }))
        return { success: true, games: games.filter(game => game !== null) }
    }
    catch(err){
        console.log(err)
        return { success: false, games: [], message: 'Server Error'}
    }
}
export const recentGames = async (leagueId, playerId) => {
    let games
    try{
        const league = await League.findById(leagueId)
        if(!league){
            return { success: false, message: `League with id ${leagueId} not found` }
        }

        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 7);
        end.setHours(0, 0, 0, 0)
        end.setDate(end.getDate()-1)


        if(league.mode === 'classic'){
            games = await Game.find({ 
                date: {
                    $gte: new Date(start), 
                    $lte: new Date(end) 
                },
                status: 'Final'
            }).sort({ date: -1 }).limit(5)
        }

        if(league.mode === 'team'){
            const team = await Team.findById(league.team)
            games = await Game.find({ 
                date: {
                    $gte: new Date(start), 
                    $lte: new Date(end) 
                },
                status: 'Final',
                $or: [{ away_team: team._id }, { home_team: team._id }]
            }).sort({ date: -1 }).limit(5)
        }

        games = await Promise.all(games.map(async game => {
            const formattedGame = await formatRecentGame(game)
            const ranking = await getRanking(game._id, playerId)
            /*
                formattedGame = { success, formatted }
                formattedGame = { success, formatted }
                formattedGame.formatted = {
                    balldontlie_id,
                    date,
                    status,
                    away_team,
                    home_team
                    away_team_score,
                    home_team_score,
                }

                ranking = { success, ranking }
                ranking.ranking = {
                    rank: Number,
                    score,
                }
            */
            if(formattedGame.success && ranking.success){
                return {
                    ...formattedGame.formatted,
                    ...ranking.ranking
                }
            }
            return null
        }))
        return { success: true, games: games }
    }
    catch(err){
        console.log(err)
        return { success: false, games: [], message: 'Server Error'}
    }
}
export const getLeaderboard = async (leagueId, userId) => {
    try{
        const user = await User.findById(userId).select('username')
        const player = await Player.findOne({ user: userId })
        const league = await League.findById(leagueId)
        let players = []

        for(const playerId of league.member_players){
            const current_player = await Player.findById(playerId).select('user')
            const user_of_current_player = await User.findById(current_player.user).select('username')

            const predictions = await Prediction.find({ player: playerId, status: 'Complete' })
            const totalScore = predictions.reduce((sum, prediction) => sum + (prediction.score || 0), 0)
            
            players.push({ 
                playerId, 
                username: user_of_current_player.username,
                mutualFriend: player.friends.includes(playerId),
                totalScore, 
            })
        }
        players.sort((a, b) => b.totalScore - a.totalScore)
        players = players.map((current, i) => {
            return {
                ...current,
                ranking: i+1
            }
        })

        return { 
            success: true, 
            players: players,
        }
    }
    catch(err){
        console.log(err)
        return { success: false, message: "Server Error", error: err }
    }
}