import mongoose from 'mongoose'

const teamSchema = mongoose.Schema({
    balldontlie_id: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    abbreviation: {
        type: String,
        required: true
    }
})

const Team = mongoose.model('Team', teamSchema)
export default Team