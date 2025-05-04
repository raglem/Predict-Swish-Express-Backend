import Game from "../models/game.module.js"
import League from "../models/league.module.js"
import Player from "../models/player.module.js"
import Prediction from "../models/prediction.module.js"
import User from "../models/user.module.js"

import bcrypt from 'bcrypt'

export const VALID_BOT_NAMES = [
    "bot1", "bot2", "bot3",
    "bot4", "bot5", "bot6",
    "bot7", "bot8", "bot9",
]
/*
 an exported function for server.js or other files to automatically update a bot (ex. friend requests and predictions)
 updateBot() is designed to simulate and demonstrate how the app works to a user
*/
export const updateBot = async (botName) => {
    if(!VALID_BOT_NAMES.includes(botName)){
        return
    }

    try{
        let user = await User.findOne({ username: botName })
        if(!user){
            user = User({
                username,
                password: await bcrypt.hash(password, 10)
            })
            await user.save()
        }

        let player = await Player.findOne({ user })
        if(!player){
            player = Player({
                user: user._id,
                friends: [],
                sent_requests: [],
                leagues: [],
                predictions: []
            })
            await player.save()
        }

        updateBotFriendRequests(player)
        updateBotLeagueInvites(player)
        updateBotPredictions(player)
    }
    catch(err){
        console.log(err)
    }
    
}
export const updateAllBots = async () => {
    try{
        for(const botName of VALID_BOT_NAMES){
            updateBot(botName)
        }
        return { success: true, message: 'Bots updated successfully' }
    }
    catch(err){
        console.log(err)
    }
}

/*
    All following controllers require "bot" argument to be a mongoose object, id and name are not proper arguments 
*/
async function updateBotFriendRequests(bot){
    try{
        // Retrieve all the player documents with a sent request to the current bot
        const requestingPlayers = await Player.find({ sent_requests: bot._id })

        for(const player of requestingPlayers){
            //Add other player to both player's friend list
            bot.friends.push(player._id)
            player.friends.push(bot._id)
            
            player.sent_requests.pull(bot._id)

            await bot.save()
            await player.save()
        }
        return true
    }
    catch(err){
        console.log(err)
        return false
    }
}

async function updateBotLeagueInvites(bot){
    try{
        const leagues = await League.find({ invited_players: bot })

        for(const league of leagues){
            league.member_players.push(bot._id)
            league.invited_players.pull(bot._id)

            await league.save()
        }

        return true
    }
    catch(err){
        console.log(err)
        return false
    }
}

async function updateBotPredictions(bot){
    const week = 1000 * 60 * 60 * 24 * 7
    const date_of_week_ago = new Date(Date.now() - week);
    date_of_week_ago.setHours(0, 0, 0, 0);
    console.log("Updating bots")

    try{
        // Retrieve all upcoming games
        let games = await Game.find({ date: { $gte: Date.now() }})

        // Filter out games that the bot has already made predictions for
        const filteredGames = await Promise.all(
            games.map(async game => {
                const predictionExists = await Prediction.findOne({ player: bot._id, game: game._id })

                // If the prediction does not exist, return the game
                return predictionExists ? null : game
            })
        );

        // Filter out the null values
        games = filteredGames.filter(game => game !== null);

        for(const game of games){
            const prediction = Prediction({
                player: bot._id,
                game: game._id
            })

            const random_away_score = Math.floor(Math.random() * 41) + 90
            const random_home_score = Math.floor(Math.random() * 41) + 90

            prediction.away_team_score = random_away_score
            prediction.home_team_score = random_home_score
            prediction.status = 'Submitted'

            await prediction.save()
        }
    }
    catch(err){
        console.log(err)
    }
}