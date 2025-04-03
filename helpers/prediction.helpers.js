import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Player from "../models/player.module.js"
import Prediction from "../models/prediction.module.js"
import User from "../models/user.module.js"

export const updatePredictions = async (gameId, away_score, home_score) => {
    try{
        const game = await Game.findById(gameId).select('away_team_score home_team_score status')
        if(!game){
            return { success: false, message: `Game with id ${gameId} does not exist`}
        }
        if(game.status !== 'Final'){
            return { success: false, message: `Game with id ${gameId} is not complete`}
        }
        const predictions = await Prediction.find({ game: gameId, status: 'Submitted' })
        for(const prediction of predictions){
            prediction.score = calculateScore(
                { actual_away_score: away_score, actual_home_score: home_score },
                { predicted_away_score: prediction.away_team_score, predicted_home_score: prediction.home_team_score }
            )
            prediction.status = 'Complete'
            await prediction.save()
        }
        return { success: true, message: `All predictions with game id ${gameId} updated` }
    }
    catch(err){
        console.log(err)
        return { success: false, message: err?.message }
    }
}

const calculateScore = (
        { actual_away_score, actual_home_score }, 
        { predicted_away_score, predicted_home_score }
    ) => {
    // Calculate difference between scores, greatest possible difference will be capped at 100
    const away_score_difference = Math.min(100, Math.abs(actual_away_score - predicted_away_score));
    const home_score_difference = Math.min(100, Math.abs(actual_home_score - predicted_home_score));

    // Calculate the maximum possible difference (assuming scores are between 0 and 100)
    const max_difference = 100;

    // Calculate the score for each difference
    const away_score_points = (1 - away_score_difference / max_difference) * 50; // Half of the total score
    const home_score_points = (1 - home_score_difference / max_difference) * 50; // Half of the total score
    console.log(away_score_points + home_score_points)
    return Math.round(away_score_points + home_score_points)

};

export const getRanking = async (gameId, playerId) => {
    try{
        let predictions = await Prediction.find({ game: gameId })
        predictions = predictions.sort((a, b) => b.score - a.score )
        for(const [i, prediction] of predictions.entries()){
            if(prediction.player.toString() === playerId.toString()){
                return { success: true, 
                    ranking: {
                        rank: i+1,
                        score: prediction.score
                    } 
                }
            }
            //lowest possible score, user will be tied with this rank
            if(prediction.score === 0){
                return { success: true, 
                    ranking: {
                        rank: i+1,
                        score: prediction.score
                    } 
                }
            }
        }
        return { success: true, 
                ranking: {
                    // in the case no one made a prediction, all users will be tied for 1st
                    rank: Math.max(1, predictions.length),
                    score: 0
                } 
        }
    }
    catch(err){
        return { success: false, ranking: -1 }
    }
}

export const getLeaguePredictionsStatus = async (gameId, leagueId) => {
    try{
        const predictions = []
        const league = await League.findById(leagueId)
        if(!league) return { success: false, message: `League with id ${leagueId} not found`}
        for(const playerId of league.member_players){
            const player = await Player.findById(playerId)
            const user = await User.findById(player.user)
            const prediction = await Prediction.findOne({ player: playerId, game: gameId })
            const status = prediction ? prediction.status : 'Pending'
            predictions.push({
                username: user.username, status
            })
        }
        return { success: true, predictions: predictions }
    }
    catch(err){
        console.log(err)
        return { success: false, error: err?.message }
    }
}
export const getLeaguePredictions = async (gameId, leagueId) => {
    try{
        const predictions = []
        const league = await League.findById(leagueId)
        if(!league) return { success: false, message: `League with id ${leagueId} not found`}
        for(const playerId of league.member_players){
            const player = await Player.findById(playerId)
            const user = await User.findById(player.user)
            const prediction = await Prediction.findOne({ player: playerId, game: gameId }).select('score')
            predictions.push({
                username: user.username,
                score: prediction.score
            })
        }
        predictions.sort((a, b) => b.score - a.score)
        return { success: true, predictions }
    }
    catch(err){
        return { success: false, error: err?.message }
    }
}