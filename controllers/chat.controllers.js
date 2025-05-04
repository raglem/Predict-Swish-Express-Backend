import Chat from '../models/chat.module.js'
import Game from '../models/game.module.js'
import League from '../models/league.module.js'
import Player from '../models/player.module.js'
import User from '../models/user.module.js'

export const handleChatSocket = (socket, io) => {
    socket.on('join-room', async ({ gameId, leagueId }) => {
        authorizeRoomAccess(socket.userId, gameId, leagueId).then((res) => {
            if(res.success){
                socket.join(res.chat.id.toString())
                socket.emit('joined-room', res.chat)
            }
            else{
                socket.emit('failed-join-room')
            }
        }).catch((err) => {
            console.log(err)
            socket.emit('failed-join-room')
        })
    })
    socket.on('send-message', async ({chatId, message}) => {
        saveMessage(socket, {chatId, message}).then((res) => {
            if(res.success){
                io.in(chatId.toString()).emit('receive-message', res.message)
            }
            else{
                socket.emit('error-message')
            }
            
        }).catch((err) => {
            console.log(err)
            socket.emit('error-message')
        })
        
    })
}

const authorizeRoomAccess = async(userId, gameId, leagueId) => {
    try{
        let chat = await Chat.findOne({ game: gameId, league: leagueId })
        if(!chat){
            const res = await createChat(gameId, leagueId)
            if(!res.success){
                return { success: false, message: res?.message }
            }
            chat = res.newChat
        }
        const player = await Player.findOne({ user: userId })
        const league = await League.findById(leagueId).select('_id member_players')

        if(!league.member_players.map(player => player.toString()).includes(player._id.toString())){
            return { success: false, message: `Player with id ${player._id} is not a member of league with id ${league._id}`}
        }

        chat = {
            id: chat._id,
            game: chat.game,
            league: chat.league,
            messages: chat.messages.map(message => {
                return {
                    id: message._id,
                    player: message.player,
                    player_name: message.player_name,
                    date: message.date,
                    content: message.content
                }
            }).sort((a, b) => b.date - a.date)
        }

        return { success: true, chat: chat }
    }
    catch(err){
        console.log(err)
        return { success: false, message: 'Server Error' }
    }
}

const saveMessage = async (socket, {chatId, message}) => {
    if(!chatId || !message){
        return { success: false, message: 'chatId and message were not provided'}
    }

    try{
        const chat = await Chat.findById(chatId)
        if(!chat){
            return { success: false, message: `Chat with id ${chatId} does not exist`}
        }
        const { _id: playerId } = await Player.findOne({ user: socket.userId }).select('_id')
        const { username } = await User.findById(socket.userId).select('username')
        const newMessage = { player: playerId, player_name: username, date: new Date(), content: message }
        chat.messages.push(newMessage)
        await chat.save()
        return { success: true, message: newMessage }
    }
    catch(err){
        console.log(err)
        return { success: false, message: 'Server Error'}
    }
}

const createChat = async (gameId, leagueId) => {
    try {
        const game = await Game.findById(gameId)
        const league = await League.findById(leagueId)
        if (!game || !league) {
            return { success: false, message: `Game with id ${gameId} or league with id ${leagueId} does not exist` };
        }

        const newChat = new Chat({
            game: game._id,
            league: league._id,
            messages: []
        })
        await newChat.save()
        return { success: true, message: `Chat with gameId ${gameId} and leagueId ${leagueId} succesfully created`, newChat: newChat.toObject()}
    }
    catch(err){
        console.log(err)
        return { success: false, message: 'Server Error' }
    }
    
}
