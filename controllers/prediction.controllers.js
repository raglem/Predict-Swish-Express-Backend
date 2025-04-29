import Prediction from '../models/prediction.module.js'
import Game from '../models/game.module.js'
import Player from '../models/player.module.js'
import League from '../models/league.module.js'
import { getTeam } from '../helpers/team.helpers.js'

export const getPredictions = async (req, res) => {
    try{
        const upcoming_predictions = await getUpcomingPredictions(req)
        const recent_predictions = await getRecentPredictions(req)
        if(!upcoming_predictions.success || !recent_predictions.success){
            return res.status(500).json({ success: false, message: 'Server Error' })
        }
        return res.status(200).json({ 
            success: true, 
            upcoming_predictions: upcoming_predictions.predictions, 
            recent_predictions: recent_predictions.predictions
        })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}
export const submitPrediction = async(req, res) => {
    if(!req.body.predictionId){
        return res.status(400).json({ success: false, message: 'Please provide a predictionId field' })
    }
    if(!req.body.away_team_score || !req.body.home_team_score){
        return res.status(400).json({ success: false, message: 'Please provide away_team_score and home_team_score fields' })
    }
    try{
        const player = await Player.findOne({ user: req.userId })
        const prediction = await Prediction.findById(req.body.predictionId)
        const game = await Game.findById(prediction.game)
        if(prediction.player.toString() !== player._id.toString()){
            return res.status(403).json({ success: false, message: `Prediction with id ${prediction._id} does not belong to player with user id ${req.userId}` })
        }
        if(prediction.status !== 'Pending'){
            return res.status(400).json({ success: false, message: `Prediction with id ${prediction._id} has already been submitted` })
        }
        if(game.date < new Date()){
            return res.status(400).json({ success: false, message: `Game with id ${game._id} has already started. Predictions can no longer be submitted`, expired: true })
        }
        prediction.away_team_score = req.body.away_team_score
        prediction.home_team_score = req.body.home_team_score

        // Update the leagues field with the leagues that the player is currently a member of
        const leagues = await League.find({ member_players: { $in: [player._id] }}).select('_id')
        for(const leagueId of leagues){
            const league = await League.findById(leagueId)
            if(league.mode === 'classic' || league.team.toString() === game.away_team.toString() || league.team.toString() === game.home_team.toString()){
                prediction.leagues.push(leagueId)
            }
        }

        prediction.status = 'Submitted'
        await prediction.save()
        return res.status(200).json({ success: true, message: `Prediction with id ${req.body.predictionId} submitted` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}

const getUpcomingPredictions = async req => {
    const now = new Date()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextThreeDays = new Date(today)
    nextThreeDays.setDate(nextThreeDays.getDate() + 3)

    try{
        let games;
        const player = await Player.findOne({ user: req.userId })
        const leagues = await League.find({ member_players: { $in: [player._id] }}).select('_id name mode team')
        const predictions = []

        if(leagues.some(league => league.mode === 'classic')){
            games = await Game.find({ date: { $gte: now, $lt: nextThreeDays } }).sort({ date: 1 })
        }
        else{
            const team_ids = leagues.map(league => league.team)
            games = await Game.find({ $or: [{ away_team: { $in: team_ids } }, { home_team: { $in: team_ids } } ]}).sort({ date: 1 }).limit(10)
        }
   
        for(const game of games){
            const prediction = await Prediction.findOne({ player: player._id, game: game._id }).populate('game')
            if(now < game.date){
                const away_team_name = await getTeam(game.away_team)
                const home_team_name = await getTeam(game.home_team)
                const included_leagues = leagues.filter(league => league.mode === 'classic' || (league.team.toString() === game.away_team.toString() || league.team.toString() === game.home_team.toString()))
                if(!prediction){
                    // no need to add leagues, leagues are added when the prediction is submitted
                    const newPrediction = new Prediction({
                        player: player._id,
                        game: game._id,
                    })
                    await newPrediction.save()
                    predictions.push({
                        id: newPrediction._id,
                        date: game.date,
                        status: 'Pending',
                        away_team: away_team_name,
                        home_team: home_team_name,
                        leagues: included_leagues.map(league => league.name)
                    })
                }
                else{
                    predictions.push({
                        id: prediction._id,
                        date: game.date,
                        status: prediction.status,
                        away_team: away_team_name,
                        home_team: home_team_name,
                        away_team_score: prediction.away_team_score,
                        home_team_score: prediction.home_team_score,
                        leagues: included_leagues.map(league => league.name)
                    })
                }
            }
        }

        // group predictions based off of date
        const dated_predictions = []
        predictions.forEach(prediction => {
            const date = new Date(prediction.date.getFullYear(), prediction.date.getMonth(), prediction.date.getDate()).toISOString().split('T')[0]
            const existingDateEntry = dated_predictions.find(entry => entry.date === date)
            if (existingDateEntry) {
                existingDateEntry.games.push(prediction)
            } else {
                dated_predictions.push({ date, games: [prediction] })
            }
        })
        return { success: true, predictions: dated_predictions }
    }
    catch(err){
        console.log(err)
        return { success: false, error: err?.message }
    }
}

const getRecentPredictions = async req => {
    try{
        const player = await Player.findOne({ user: req.userId})
        const leagues = await League.find({ member_players: { $in: [player._id] }}).select('_id name mode team')

        let predictions = await Prediction.find({ 
            player: player._id, 
            status: 'Complete' 
        }).populate({
            path: 'game',
            select: 'date'
        });

        // Sort predictions by game date in descending order and take the first 10
        predictions = predictions.sort((a, b) => new Date(b.game.date) - new Date(a.game.date)).slice(0, 10);

        predictions = await Promise.all(predictions.map(async prediction => {
            const game = await Game.findById(prediction.game).select('date away_team home_team away_team_score home_team_score')
            const away_team_name = await getTeam(game.away_team)
            const home_team_name = await getTeam(game.home_team)
            const included_leagues = leagues.filter(league => league.mode === 'classic' || (league.team.toString() === game.away_team.toString() || league.team.toString() === game.home_team.toString()))
            return {
                id: prediction._id,
                date: game.date,
                status: prediction.status,
                score: prediction.score,
                away_team: away_team_name,
                home_team: home_team_name,
                actual_away_team_score: game.away_team_score,
                actual_home_team_score: game.home_team_score,
                predicted_away_team_score: prediction.away_team_score,
                predicted_home_team_score: prediction.home_team_score,
                leagues: included_leagues.map(league => league.name)
            }
        }))

        const dated_predictions = []
        predictions.forEach(prediction => {
            const date = new Date(prediction.date.getFullYear(), prediction.date.getMonth(), prediction.date.getDate()).toISOString().split('T')[0]
            const existingDateEntry = dated_predictions.find(entry => entry.date === date)
            if (existingDateEntry) {
                existingDateEntry.games.push(prediction)
            } else {
                dated_predictions.push({ date, games: [prediction] })
            }
        })
        dated_predictions.sort((a, b) => new Date(b.date) - new Date(a.date))
        return { success: true, predictions: dated_predictions }
    }
    catch(err){
        console.log(err)
        return { success: false, error: err?.message}
    }
    
}