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
        const leagues = await League.find({ member_players: { $in: [player._id] }}).select('_id mode team')
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
                        home_team: home_team_name
                    })
                }
                else{
                    predictions.push({
                        id: prediction._id,
                        date: game.date,
                        away_team: away_team_name,
                        home_team: home_team_name
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