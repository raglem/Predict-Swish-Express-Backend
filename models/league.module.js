import mongoose from 'mongoose'

const leagueSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    join_code:{
        type: String,
        immutable: true,
        unique: true,
        validate: {
            validator: function(v){
                const codeStr = v.toString()
                if(codeStr.length !== 8){
                    return false
                }
                //check codeStr is all numbers
                for(let i=0; i<8; i++){
                    if(codeStr[i] < '0' || codeStr[i] > '9'){
                        return false
                    }
                }
                return true;
            },
            message: 'Join code must be an 8 digit number'
        }
    },
    mode: {
        type: String,
        enum: ['classic', 'team'],
        required: true
    },
    //team field only required if mode is team
    team: {
        type: mongoose.Schema.Types.ObjectId,
        required: function(){
            this.mode === 'team'
        },
    },
    games: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Games',
        required: true
    },
    member_players: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Players',
        required: true,
    },
    invited_players:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Players',
        required: true
    },
    requesting_players: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Players',
        required: true
    }
})

leagueSchema.pre('save', async function (next) {
    if (!this.join_code) {
        this.join_code = await generateJoinCode();
    }
    next();
});
async function generateJoinCode() {
    while (true){
        const generatedCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        if(!(await mongoose.model('League').findOne({join_code: generatedCode}))){
            return generatedCode
        }
    }
}

leagueSchema.pre('validate', function(next) {
    const member_players = this.member_players || []
    const invited_players = this.invited_players || []
    const requesting_players = this.requesting_players || []

    const memberPlayerSet = new Set(member_players)
    if(memberPlayerSet.size !== member_players.length){
        return next (new Error("Member players cannot have duplicates"))
    }
    const invitedPlayerSet = new Set(invited_players)
    if(invitedPlayerSet.size !== invited_players.length){
        return next (new Error("Invited players cannot have duplicates"))
    }
    const requestingPlayerSet = new Set(requesting_players)
    if(requestingPlayerSet.size !== requesting_players.length){
        return next (new Error("Requesting players cannot have duplicates"))
    }

    const allPlayers = new Set([...member_players, ...invited_players, ...requesting_players])
    if(allPlayers.size !== member_players.length + invited_players.length + requesting_players.length){
        return next (new Error("Member players, invited players, and requesting players cannot overlap"))
    }
    next();
})

const League = mongoose.model('League', leagueSchema)
export default League