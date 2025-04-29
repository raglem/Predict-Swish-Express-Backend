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

export const updateAllPredictions = async () => {
    // Get all games within the last week to avoid attempt to update too many predictions
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    try{
        const games = await Game.find({ status: 'Final', date: { $gte: weekAgo } })
        for(const game of games){
            const predictions = await Prediction.find({ game: game._id, status: 'Submitted' })
            for(const prediction of predictions){
                prediction.score = calculateScore(
                    { actual_away_score: game.away_team_score, actual_home_score: game.home_team_score },
                    { predicted_away_score: prediction.away_team_score, predicted_home_score: prediction.home_team_score }
                )
                prediction.status = 'Complete'
                await prediction.save()
            }
        }
        return { success: true, message: `All predictions updated` }
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
    /*
        The max difference determines how many points are awarded based on the difference
        Ex. Assume the user's prediction is wrong by 10 points. If the max difference is 20 points, the user's scoring quotient is 50% and the raw score will be 50%.
        If the max difference is 40 points, the scoring quotient is 25% and subtracted from 1, resulting in 75% raw score. 
        A greater max difference will award more points
        A lower max difference will award less points
    */

    const max_difference = 50;

    // Calculate difference between scores, greatest possible difference will be capped at 50 to avoid a scoring quotient greater than 1, which would result in a negative raw score 
    const away_score_difference = Math.min(max_difference, Math.abs(actual_away_score - predicted_away_score));
    const home_score_difference = Math.min(max_difference, Math.abs(actual_home_score - predicted_home_score));

    // The raw_score is a percentage representing the user's accuracy (a higher raw score indicates the prediction was closer to the result)
    const raw_away_score = (1 - away_score_difference / max_difference)
    const raw_home_score = (1 - home_score_difference / max_difference)

    // The raw scores are multiplied by 50 and summed to get a greatest possible score of 100
    const away_score_points = raw_away_score * 50; // Half of the total score
    const home_score_points = raw_home_score * 50; // Half of the total score
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