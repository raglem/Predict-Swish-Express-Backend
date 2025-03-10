import express from 'express'
import { getPlayer, addFriend, acceptFriend, cancelFriendRequest, deleteFriend, getAllPlayers } from '../controllers/player.controllers.js'

const playerRouter = express.Router()

playerRouter.get('/', getPlayer)
playerRouter.post('/add-friend', addFriend)
playerRouter.patch('/accept-friend', acceptFriend)
playerRouter.delete('/delete-request', cancelFriendRequest)
playerRouter.delete('/delete-friend', deleteFriend)
playerRouter.get('/all', getAllPlayers)


export default playerRouter