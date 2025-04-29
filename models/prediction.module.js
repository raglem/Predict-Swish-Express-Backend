import mongoose from 'mongoose'

const predictionSchema = mongoose.Schema({
    player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true,
    },
    leagues: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'League',
        required: true,
        default: []
    },
    status:{
        type: String,
        /*
            pending: user has not submitted prediction
            submitted: user has submitted prediction, game and score have not been finalized
            complete: user has submitted prediction and game is complete, score should be assigned
        */
        enum: ['Pending', 'Submitted', 'Complete'],
        default: 'Pending'
    },
    away_team_score:{
        type: Number,
        default: 0,
        required: true
    },
    home_team_score:{
        type: Number,
        default: 0,
        required: true
    },
    score: {
        type: Number,
        default: 0,
        required: true
    }
})

predictionSchema.index({ player: 1, game: 1 }, { unique: true})

predictionSchema.pre('validate', async function(next){
    try{
        if(!(await mongoose.model('Player').exists({ _id: this.player }))){
            return next(new Error(`Player with id ${this.player} does not exist`))
        }
        if(!(await mongoose.model('Game').exists({ _id: this.game }))){
            return next(new Error(`Game with id ${this.game} does not exist`))
        }
        next()
    } 
    catch(err){
        return next(err)
    }
})

const Prediction = mongoose.model('Prediction', predictionSchema)
export default Prediction