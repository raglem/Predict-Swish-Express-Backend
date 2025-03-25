import Prediction from '../models/prediction.module.js'
import Game from '../models/game.module.js'
import Player from '../models/player.module.js'
import League from '../models/league.module.js'
import { getTeam } from '../helpers/team.helpers.js'

export const getPredictions = async (req, res) => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    try{
        let games;
        const player = await Player.findOne({ user: req.userId })
        const leagues = await League.find({ member_players: { $in: [player._id] }}).select('_id name mode team')
        console.log(leagues)
        const predictions = []

        if(leagues.some(league => league.mode === 'classic')){
            games = await Game.find({ date: { $gt: today } }).sort({ date: 1 }).limit(20)
        }
        else{
            const team_ids = leagues.map(league => league.team)
            games = await Game.find({ $or: [{ away_team: { $in: team_ids } }, { home_team: { $in: team_ids } } ]}).sort({ date: 1 }).limit(20)
        }
   
        for(const game of games){
            const prediction = await Prediction.findOne({ player: player._id, game: game._id }).populate('game')
            if(now < game.date){
                const away_team_name = await getTeam(game.away_team)
                const home_team_name = await getTeam(game.home_team)
                const included_leagues = leagues.filter(league => league.mode === 'classic' || (league.team.toString() === game.away_team.toString() || league.team.toString() === game.home_team.toString()))
                if(!prediction){
                    const newPrediction = new Prediction({
                        player: player._id,
                        game: game._id,
                    })
                    await newPrediction.save()
                    predictions.push({
                        id: newPrediction._id,
                        date: game.date,
                        away_team: away_team_name,
                        home_team: home_team_name,
                        leagues: included_leagues.map(league => league.name)
                    })
                }
                else{
                    predictions.push({
                        id: prediction._id,
                        date: game.date,
                        away_team: away_team_name,
                        home_team: home_team_name,
                        leagues: included_leagues.map(league => league.name)
                    })
                }
            }
        }
        return res.status(200).json({ success: true, data: predictions })
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
        prediction.status = 'Submitted'
        await prediction.save()
        return res.status(200).json({ success: true, message: `Prediction with id ${req.body.predictionId} submitted` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}