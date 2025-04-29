
import { api, formatDate, formatGame} from "../config/balldontlie_api.js"

import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Player from "../models/player.module.js"
import Prediction from "../models/prediction.module.js"
import Team from "../models/team.module.js"

import { updatePredictions } from "../helpers/prediction.helpers.js"
import { formatGameWithPredictions, formatGameWithPredictionStatus } from "../helpers/game.helpers.js"
import { updateAllBots } from "../helpers/bots.helpers.js"

export const getGames = async (req, res) => {
    const today = new Date()
    try{
        const player = await Player.findOne({ user: req.userId })
        const leagues = await League.find({ member_players: player._id })
        const upcoming_games = []
        const recent_games = []
        let league_upcoming_games = []
        let league_recent_games = []
        for(const league of leagues){
            if(league.mode == 'classic'){
                league_upcoming_games = await Game.find({ date: { $gte: Date.now() } }).limit(5).sort({ date: 1}).select('_id')
                league_recent_games = await Game.find({ date: { $lt: Date.now() }}).limit(5).sort({ date: 1 }).select('_id')
            }
            else{
                const team = league.team
                league_upcoming_games = await Game.find({ team: team, date: { $gte: Date.now() } }).sort({ date: 1}).limit(5).select('_id')
                league_recent_games = await Game.find({ date: { $lt: Date.now() }}).sort({ date: -1 }).limit(5).select('_id')
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
export const loadGames = async ()=> {
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
        await updateAllBots()
        return { success: true, message: `${numberAdded} games successfully added`}
    }
    catch(err) {
        console.log(err)
        return { success: false, message: 'Server Error'}
    }
}
export const updateGames = async () => {
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
        // Update games that are pending and occurred more than a week ago
        let gameCounter = 0
        const games = await Game.find({ status: { $ne: 'Final' }, date: { $lt: new Date() } })
        for(const pendingGame of games){
            // set interval for 5 sec between requests to avoid too many requests from api
            if(gameCounter === 5){ 
                gameCounter = 0
                await new Promise(resolve => setTimeout(resolve, 5000)) 
            } 
            try{
                const retrievedGame = await api.get(`/games/${pendingGame.balldontlie_id}`)
                if(retrievedGame.data.status === 'Final'){
                    pendingGame.status = 'Final'
                    pendingGame.away_team_score = retrievedGame.data.visitor_team_score
                    pendingGame.home_team_score = retrievedGame.data.home_team_score
                    await pendingGame.save()
                    await updatePredictions(pendingGame._id, pendingGame.away_team_score, pendingGame.home_team_score)
                    numberUpdated++
                    gameCounter++
                }
            }
            catch(err){
                if(err.response.status === 404 && err.response.statusText === "Not Found"){
                    await Game.deleteOne({ _id: pendingGame._id });
                    await Prediction.deleteMany({ game: pendingGame._id })
                }
            }
        }
        return { success: true, message: `${numberUpdated} games updated`}
    }
    catch(err) {
        console.log(err)
        return { success: false, message: 'Server Error'}
    }
}
export const retrieveGames = async (start, end) =>{
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
export const verifyGames = async () => {
    const today = new Date()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

    try{
        const games = await Game.find({ date: { $gte: today, $lt: end}})

        for(const game of games){
            try{
                const retrievedGame = await api.get(`/games/${game.balldontlie_id}`)
            }
            catch(err){
                if(err.response.status === 404 && err.response.statusText === "Not Found"){
                    await Game.deleteOne({ _id: game._id });
                    await Prediction.deleteMany({ game: game._id })
                }
            }
        }

        return { success: true, message: "Games verified successfully" }
    }
    catch(err){
        console.log(err)
        return { success: false, message: 'Server Error'}
    }
}


