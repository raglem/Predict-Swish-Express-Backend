import Game from "../models/game.module.js"
import Prediction from "../models/prediction.module.js"

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
    console.log(actual_away_score)
    console.log
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