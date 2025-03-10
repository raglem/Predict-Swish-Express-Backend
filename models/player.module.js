import mongoose from 'mongoose'

const playerSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true,
        unique: true,
    },
    friendId: {
        type: String,
        unique: true,
        validate: {
            validator: function(v){
                if(v.length !== 8){
                    return false
                }
            },
            message: 'A friend id must be exactly 8 digits.'
        } 
    },
    friends: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Player',
        required: true,
        validate: {
            validator: function(v){
                if(v.includes(this._id)){
                    throw new Error('You cannot friend yourself')
                }
                //map to String to allow object comoparisons
                if(new Set(v.map(String)).size !== v.length ){
                    throw new Error('Friends cannot have duplicate players')
                }
                const sentRequestsSet = new Set(this.sent_requests.map(id => id.toString()));
                if (v.some(friend => sentRequestsSet.has(friend.toString()))) {
                    return next(new Error('Friends and sent requests cannot overlap'));
                }
                return true
            }
        }
    },
    sent_requests: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Player',
        required: true,
        validate: {
            validator: function(v){
                if(v.includes(this._id)){
                    throw new Error('You cannot send a friend request to yourself')
                }
                //map to String to allow object comoparisons
                if(new Set(v.map(String)).size !== v.length ){
                    throw new Error('Sent requests cannot have duplicate players')
                }
                const friendsSet = new Set(this.friends.map(id => id.toString()))
                if (v.some(friend => friendsSet.has(friend.toString()))) {
                    return next(new Error('Friends and sent requests cannot overlap'));
                }
                return true
            }
        }
    },
    leagues: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "League",
        required: true,
        validate: {
            validator: function(v){
                //map to String to allow object comoparisons
                if(new Set(v.map(String)).size !== v.length ){
                    return false
                }
                return true
            }
        }
    },
})

playerSchema.pre('save', async function(next){
    if(this.isNew){
        const existingPlayer = await mongoose.model('Player').exists({ user: this.user });
        if (existingPlayer) {
            return next(new Error('A user can only be related to one player'));
        }
    }
    if(!this.friendId){
        this.friendId = await generateFriendId()
    }
    next()
})

async function generateFriendId(){
    while(true){
        const newId = Math.floor(10000000 + Math.random() * 90000000)
        if(!(await mongoose.model('Player').exists({ friendId: newId }))){
            return newId
        }
    }
}

const Player = mongoose.model('Player', playerSchema)
export default Player