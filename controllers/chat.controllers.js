import Chat from '../models/chat.module.js'
import Game from '../models/game.module.js'
import League from '../models/league.module.js'
import Player from '../models/player.module.js'
import User from '../models/user.module.js'

export const getChat = async (req, res) => {
    const { gameId, leagueId } = req.query
    if(!gameId || !leagueId){
        return res.status(400).json({ success: false, message: 'Please provide fields gameId and leagueId' })
    }
    try {
        // Check if current user should have access to the chat
        const player = await Player.findOne({ user: req.userId }).select('_id')
        const game = await Game.findById(gameId)
        const league = await League.findById(leagueId)
        if(league && !league.member_players.map(player => player._id.toString()).includes(player._id.toString())){
            return res.status(403).json({ success: false, message: `Player with id ${player._id} is not a member of league with id ${req.body.leagueId}` })
        }

        // Retrieve the chat
        let chat = await Chat.findOne({ game: gameId, league: leagueId})
        if(!chat){
            if(!game){
                return res.status(400).json({ success: false, message: `Game with id ${gameId} does not exist` })
            }
            if(!league){
                return res.status(400).json({ success: false, message: `Game with id ${leagueId} does not exist` })
            }

            // Create a new chat if one doesn't exist
            const newChat = new Chat({
                game: game._id,
                league: league._id,
                messages: []
            })
            await newChat.save()
            chat = newChat
        }
        return res.status(200).json({ success: true, chat})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}
export const sendMessage = async (req, res) => {
    if(!req.body.chatId || !req.body.content){
        return res.status(400).json({ success: false, message: 'Please provide a chatId and content field'})
    }

    try{
        const chat = await Chat.findById(req.body.chatId)
        if(!chat){
            return res.status(400).json({ success: false, message: `Chat with id ${req.body.chatId} does not exist`})
        }

        // Check if current user should have access to the chat
        const user = await User.findById(req.userId).select('username')
        const player = await Player.findOne({ user: req.userId }).select('_id')
        const league = await League.findById(chat.league)
        if(league && !league.member_players.map(player => player._id.toString()).includes(player._id.toString())){
            return res.status(403).json({ success: false, message: `Player with id ${player._id} is not a member of league with id ${req.body.leagueId}` })
        }

        // Create and add new message to the chat
        chat.messages.push({
            player: player._id,
            player_name: user.username,
            content: req.body.content
        })
        await chat.save()
        return res.status(200).json({ success: true, message: 'Message sent successfully' })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}