import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Team from "../models/team.module.js"
import { formatUpcomingGame, formatRecentGame } from '../helpers/game.helpers.js'
export const upcomingGames = async leagueId => {
    try{
        let games
        const league = await League.findById(leagueId)

        const start = new Date()
        const end = new Date(start);
        end.setDate(start.getDate() + 7);

        const formatDate = date => date.toISOString().split('T')[0] + "T00:00:00.000Z";
        const todayDateString = formatDate(start);
        const nextWeekDateString = formatDate(end);
        
        if(!league){
            return { success: false, message: `League with id ${leagueId} not found` }
        }
        if(league.mode === 'classic'){
            games = await Game.find({ 
                date: {
                    $gte: new Date(todayDateString), 
                    $lte: new Date(nextWeekDateString) 
                }
            }).sort({ balldontlie_id: 1 }).limit(5)
        }
        if(league.mode === 'team'){
            const team = await Team.findById(league.team)
            games = await Game.find({ 
                date: {
                    $gte: new Date(todayDateString), 
                    $lte: new Date(nextWeekDateString) 
                },
                $or: [{ away_team: team._id }, { home_team: team._id }]
            }).sort({ balldontlie_id: 1}).limit(5)
        }
        games = await Promise.all(games.map(async game => {
            const formattedGame = await formatUpcomingGame(game)
            if(formattedGame.success){
                /*
                    formattedGame = { success, formatted }
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

export const recentGames = async leagueId => {
    let games
    try{
        const league = await League.findById(leagueId)
        if(!league){
            return { success: false, message: `League with id ${leagueId} not found` }
        }

        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 7);

        const formatDate = date => date.toISOString().split('T')[0] + "T00:00:00.000Z";
        const lastWeekDateString = formatDate(start);
        const todayDateString = formatDate(end)

        if(league.mode === 'classic'){
            games = await Game.find({ 
                date: {
                    $gte: new Date(lastWeekDateString), 
                    $lte: new Date(todayDateString) 
                },
                status: 'Final'
            }).sort({ date: -1 }).limit(5)
        }

        if(league.mode === 'team'){
            const team = await Team.findById(league.team)
            games = await Game.find({ 
                date: {
                    $gte: new Date(lastWeekDateString), 
                    $lte: new Date(todayDateString) 
                },
                status: 'Final',
                $or: [{ away_team: team._id }, { home_team: team._id }]
            }).sort({ date: -1 }).limit(5)
        }

        games = await Promise.all(games.map(async game => {
            const formattedGame = await formatRecentGame(game)
            if(formattedGame.success){
                /*
                    formattedGame = { success, formatted }
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