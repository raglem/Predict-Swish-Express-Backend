import mongoose from 'mongoose'
import Prediction from './prediction.module.js'

const leagueMembershipSchema = mongoose.Schema({
    player:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    league: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League',
        required: true,
    },
    games: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Game',
        default: [],
    },
    predictions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Prediction',
        default: [],
    },
})

leagueMembershipSchema.index({ player: 1, league: 1}, { unique: true})

leagueMembershipSchema.methods.getTotalScore = async function(){
    const predictions = await Prediction.find({ _id: { $in: this.predictions }})
    return predictions.reduce((accumulator, current) => {
        return accumulator + current.score
    }, 0)
}


const LeagueMembership = mongoose.model('LeagueMembership', leagueMembershipSchema)
export default LeagueMembership