
import { api, formatDate, formatGame} from "../config/balldontlie_api.js"
import Team from "../models/team.module.js"
import Game from "../models/game.module.js"
import { updatePredictions } from "../helpers/prediction.helpers.js"
import Player from "../models/player.module.js"
import League from "../models/league.module.js"
import { formatGameWithPredictions, formatGameWithPredictionStatus } from "../helpers/game.helpers.js"
export const getGames = async (req, res) => {
    const today = new Date()
    const nextThreeDays = new Date(today);
    nextThreeDays.setDate(today.getDate() + 3);
    const lastThreeDays = new Date(today)
    lastThreeDays.setDate(today.getDate() - 3)
    try{
        const player = await Player.findOne({ user: req.userId })
        const leagues = await League.find({ member_players: player._id })
        const upcoming_games = []
        const recent_games = []
        let league_upcoming_games = []
        let league_recent_games = []
        for(const league of leagues){
            if(league.mode == 'classic'){
                league_upcoming_games = await Game.find({ 
                    date: {
                        $gte: today,
                        $lt: nextThreeDays
                    }
                }).limit(10).select('_id')
                league_recent_games = await Game.find({ 
                    date: {
                        $gte: lastThreeDays,
                        $lt: today
                    }
                }).limit(10).select('_id')
            }
            else{
                const team = league.team
                league_upcoming_games = await Game.find({ 
                    team: team,
                    date: {
                        $gte: today,
                        $lt: nextThreeDays
                    }
                }).limit(10).select('_id')
                league_recent_games = await Game.find({ 
                    team: team,
                    date: {
                        $gte: lastThreeDays,
                        $lt: today
                    }
                }).limit(10).select('_id')
            }
            league_upcoming_games = await Promise.all(league_upcoming_games.map(async game => {
                const res = await formatGameWithPredictionStatus(game._id, league._id) //{ success, formatted }
                if(res.success){
                    return res.formatted
                }
                return
            }))
            league_recent_games = await Promise.all(league_recent_games.map(async game => {
                const res = await formatGameWithPredictions(game._id, league._id) //{ success, formatted }
                if(res.success){
                    return res.formatted
                }
                return
            }))
            upcoming_games.push(...league_upcoming_games)
            recent_games.push(...league_recent_games)

            league_recent_games = []
            league_upcoming_games = []
        }
        upcoming_games.sort((a,b) => a.date - b.date)
        recent_games.sort((a,b) => b.date - a.date)
        return res.status(200).json({ success: true, upcoming_games, recent_games })
    }
    catch(err){
        console.log(err)
        return res.status(400).json({ success: false, message: 'Server Error' })
    }
}
export const loadGames = async (req, res) => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
    try{
        let numberAdded = 0
        const retrievedGames = await retrieveGames(start, end)
        for(const retrievedGame of retrievedGames){
            const game = await Game.findOne({ balldontlie_id: retrievedGame.id })
            if(!game){
                const formattedGame = await formatGame(retrievedGame)
                if(formattedGame.success === true){
                    const newGame = Game(formattedGame.formatted)
                    await newGame.save()
                    numberAdded++
                }
            }
        }
        return res.status(200).json({ success: true, message: `${numberAdded} games successfully added`})
    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}
export const updateGames = async (req, res) => {
    const today = new Date()
    /*
    retrieve Games from last week to today
    we can retrieve games in groups with the retrieveGames method
    afterward, we will individually lookup and update games that have status pending and occurred more than a week ago
    */
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    try{
        let numberUpdated = 0;
        const retrievedGames = await retrieveGames(start, end)
        for(const retrievedGame of retrievedGames){
            if(retrievedGame.status === 'Final'){
                const game = await Game.findOne({ balldontlie_id: retrievedGame.id })
                if(game && (game.status == 'Pending' || game.status == 'Upcoming')){
                    game.status = 'Final'
                    game.away_team_score = retrievedGame.visitor_team_score
                    game.home_team_score = retrievedGame.home_team_score
                    await game.save()
                    await updatePredictions(game._id, game.away_team_score, game.home_team_score)
                    numberUpdated++
                }
            }
        }
        return res.status(200).json({ success: true, message: `${numberUpdated} games updated`})
    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}
async function retrieveGames(start, end){
    if(!(start instanceof Date && end instanceof Date)){
        return { success: false, message: 'Invalid start and end date fields' }
    }

    const games = []
    let currentDay = start
    let numberOfRequests = 0
    while(currentDay < end && numberOfRequests < 5){
        if(numberOfRequests > 0){
            await new Promise(resolve => setTimeout(resolve, 5000)) // set interval for 5 sec between requests to avoid too many requests from api
        }
        const formattedStart = formatDate(currentDay)
        const formattedEnd = formatDate(end)
        try{
            const gamesBatch = await api.get(`/games?start_date=${formattedStart}&end_date=${formattedEnd}`)
            games.push(...gamesBatch.data.data)
        }
        catch(err){
            console.log(err)
        }
        const lastGame = games[games.length-1]
        const lastDate = new Date(lastGame.date)
        currentDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())
        numberOfRequests += 1;
    }
    return [...new Map(games.map((game) => [game.id, game])).values()] //get rid of duplicates
}


