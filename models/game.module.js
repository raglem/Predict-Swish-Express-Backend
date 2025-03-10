import mongoose from 'mongoose'
import jswonwebtoken from 'jsonwebtoken'

const gameSchema = mongoose.Schema({
    balldontlie_id: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    season: {
        type: Number,
        required: true
    },
    away_team: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Team'
    },
    home_team: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Team'
    },
    away_team_score: {
        type: Number,
        required: true
    },
    home_team_score: {
        type: Number,
        required: true
    }
})

const Game = mongoose.model('Game', gameSchema)
export default Game

