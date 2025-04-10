import { mongoose } from 'mongoose'

const messageSchema = new mongoose.Schema({
    player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    player_name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: {
        type: String,
        required: true
    }
})

const chatSchema = new mongoose.Schema({
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    league: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    messages: {
        type: [messageSchema],
        required: true
    }
})

chatSchema.index({ game: 1, league: 1 }, { unique: true})

const Chat = mongoose.model('Chat', chatSchema)
export default Chat