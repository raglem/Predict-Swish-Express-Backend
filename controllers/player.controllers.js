import mongoose from 'mongoose'

import Player from '../models/player.module.js'
import User from '../models/user.module.js'

export const getPlayer = async (req, res) => {
    try{
        if(!( await Player.exists({ user: req.userId} ))){
            return res.status(404).json({ success: false, message: "User's player not found"} )
        }

        let player = await Player.findOne({ user: req.userId })
        const user = await User.findById(req.userId)

        //use Promise.all() to ensure all friends are asynchronously fetched
        const friends = await Promise.all(
            player.friends.map(async (friendId) => {
                const friend = await Player.findById(friendId).populate('user');
                return {
                    id: friendId,
                    name: friend.user.username
                };
            })
        );

        const sent_requests = await Promise.all(
            player.sent_requests.map(async friendId => {
                const friend = await Player.findById(friendId).populate('user')
                return {
                    id: friend._id,
                    name: friend.user.username
                }
            })
        )
        
        //retrieve all players with the current player id in their sent requests (i.e. get all the players that sent the current user a friend request)
        const received_requests_players = await Player.find({
            sent_requests: { $in: [player._id] }
        })
        .populate('user')
        .select('_id user')
        .exec();
        
        const received_requests = received_requests_players.map(player => ({
            id: player._id,
            name: player.user.username
        }));
        

        return res.status(200).json({ success: true, data: {
            ...player.toObject(),
            username: user.username,
            friends: friends,
            sent_requests: sent_requests,
            received_requests,
        }})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
    
}

export const getFriends = async (req, res) => {
    if(!Player.exists({ user: req.userId} )){
        return res.status(404).json({ success: false, message: 'Player not found'} )
    }
}

export const addFriend = async (req, res) => {
    if (!req.body.friendId) {
        return res.status(400).json({ success: false, message: 'Field friendId must be provided' });
    }

    const friendId = req.body.friendId;

    try {
        const userPlayer = await Player.findOne({ user: req.userId });
        const friend = await Player.findOne({ friendId: friendId });

        if (!userPlayer) {
            return res.status(404).json({ success: false, message: "User's player not found" });
        }
        if (!friend) {
            return res.status(404).json({ success: false, message: `Player with id ${friendId} not found` });
        }

        // Prevent self-friending
        if (userPlayer._id.equals(friend._id)) {
            return res.status(400).json({ success: false, message: "User's player cannot friend itself" });
        }

        // Check if already friends
        if (userPlayer.friends.some(f => f.equals(friend._id))) {
            return res.status(400).json({ success: false, message: `Player with id ${friendId} is already a friend` });
        }

        userPlayer.sent_requests.push(friend._id)
        await userPlayer.save()

        const userFriend = await User.findById(friend.user)

        return res.status(200).json({ success: true, message: `Player with id ${friendId} was added to sent requests`, data: { id: friend._id, name: userFriend.username }});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};
export const acceptFriend = async(req, res) => {
    if(!req.body.friendId){
        return res.status(400).json({ success: false, message: 'Please provide a friendId field'})
    }
    try{
        const userPlayer = await Player.findOne({ user: req.userId })
        const friendId = req.body.friendId
        const playerId = userPlayer._id
        const received_requests = await Player.find({ sent_requests: { $in: [playerId] }})
        if(received_requests.some(player => player._id.toString() === friendId.toString())){
            const friend = await Player.findById(friendId)

            //ensure bi-directional friendship
            userPlayer.friends.push(friendId)
            friend.friends.push(playerId)

            friend.sent_requests.pull(playerId)

            await userPlayer.save()
            await friend.save()
            return res.status(200).json({ success: true, message: `Player with id ${req.body.friendId} was added to your friend list`})
        }
        else{
            return res.status(404).json({ success: false, message: `Player with id ${req.body.friendId} was not found in your received friend requests`})
        }
    }
    catch(err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
    
}
export const cancelFriendRequest = async (req, res) => {
    if(!req.body.friendId){
        return res.status(400).json({ success: false, message: 'Field friendId must be provided' });
    }
    const friendId = req.body.friendId

    try{
        const userPlayer = await Player.findOne({ user: req.userId })
        const friend = await Player.findById(friendId)

        if(!userPlayer){
            return res.status(404).json({ success: false, message: 'User player not found'})
        }
        if(!friend){
            return res.status(404).json({ success: false, message: `Player with id ${friendId} not found`})
        }
        if(userPlayer.sent_requests.every(f => !f.equals(friendId))){
            return res.status(400).json({ success: false, message: `Player with id ${friendId} is not in sent requests of user`})
        }

        userPlayer.sent_requests.remove(friendId)
        await userPlayer.save()

        return res.status(200).json({ success: true, message: `Player with id ${friendId} was removed from user's sent requests`})
    }
    catch(err){
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}
export const deleteFriend = async (req, res) => {
    if(!req.body.friendId){
        return res.status(400).json({ success: false, message: 'Field friendId must be provided' });
    }
    const friendId = req.body.friendId

    try{
        const userPlayer = await Player.findOne({ user: req.userId })
        const friend = await Player.findById(friendId)

        if(!userPlayer){
            return res.status(404).json({ success: false, message: 'User player not found'})
        }
        if(!friend){
            return res.status(404).json({ success: false, message: `Player with id ${friendId} not found`})
        }

        if(userPlayer.friends.every(f => !f.equals(friendId))){
            return res.status(400).json({ success: false, message: `Player with id ${friendId} is not a friend of user`})
        }

        userPlayer.friends.remove(friendId)
        friend.friends.remove(userPlayer._id)
        await userPlayer.save()
        await friend.save()

        return res.status(200).json({ success: true, message: `Player with id ${friendId} was removed from user's friend list`})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}

//admin methods
export const getAllPlayers = async (req, res) => {
    try{
        const allPlayers = await Player.find().lean()
        const formattedPlayers = await Promise.all(allPlayers.map(async player => {
            const user = await User.findById(player.user)
            return {
                ...player,
                name: user.username,
                friends: await Promise.all(player.friends.map(async friendId => {
                    const friend = await Player.findById(friendId).populate('user', 'username')
                    return friend?.user?.username
                }))
            }
        }))
        return res.status(200).json({ success: true, data: formattedPlayers })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
    
}
