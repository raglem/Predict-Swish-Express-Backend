import Player from '../models/player.module.js'
import League from '../models/league.module.js'

import mongoose from 'mongoose'
import User from '../models/user.module.js'

export const createLeague = async(req, res) => {
    const rawData = req.body
    let userPlayer;
    try{
        userPlayer = await Player.findOne({ user: req.userId })
        if(!userPlayer){    
            res.status(404).json({ success: false, message: `Player with user id ${req.userId} not found`})
        }
    }
    catch(err){
        res.status(500).json({ success: false, message: 'Server Error' })
    }

    if(!rawData.name || !rawData.mode)
    {
        return res.status(400).json({ success: false, message: "Please provide all league fields"})
    }

    //add check to make sure team is provided if team mode is specified
    if(rawData.mode === "team" && !rawData.team){
        return res.status(400).json({ success: false, message: "Please provide a team field"})
    }

    try{
        const leagueExists = await League.exists({ name: rawData.name })
        if(!leagueExists){    
            return res.status(400).json({ success: false, message: "League name already taken" })
        }
    }
    catch(err){
        return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const leagueData = {
        owner: userPlayer._id,
        ...rawData,
        member_players: [],
        requesting_players: [],
        invited_players: rawData.invited_players || []
    }
    
    const newLeague = new League(leagueData)
    await newLeague.save()
    res.status(201).json({  success: true, data: leagueData})
}

export const addPlayers = async (req, res) => {
    try {
        const verifiedData = await verifyLeagueAndPlayers(req);

        if (!verifiedData.success) {
            return res.status(400).json(verifiedData);
        }

        const {league, verifiedPlayers} = verifiedData
        const allPlayers = [...league.member_players, ...league.invited_players, ...league.requesting_players].map(p => p.toString()); //cast to String for includes() check

        const playersAlreadyInLeague = verifiedPlayers.filter(player => allPlayers.includes(player.toString()));
        const invited_players = verifiedPlayers.filter(player => !allPlayers.includes(player.toString()));

        if(invited_players.length > 0){
            league.invited_players.push(...invited_players)
            await league.save()
        }
        
        return res.status(200).json({
            success: true,
            message: 'Players added',
            invitedPlayers: invited_players,
            playersAlreadyInLeague,
            invalidPlayers: verifiedData.invalidPlayers,
        })
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const removePlayer = async(req, res) => {
    if(!req.body.leagueId || !req.body.playerId){
        return res.status(400).json({ success: false, message: 'Please provide leagueId and playerId field to delete'})
    }

    try{
        const userPlayer = await Player.findOne({ user: req.userId})
        const league = await League.findById(req.body.leagueId)
        const player = await Player.findById(req.body.playerId)
        const playerId = req.body.playerId
    
        if(!league){
            return res.status(404).json({ success: false, message: `League with ${req.body.leagueId} not found`})
        }
        if(!player){
            return res.status(404).json({ success: false, message: `Player with ${playerId} not found`}) 
        }
        if(league.owner !== userPlayer._id){
            return { success: false, message: `Player with user id ${req.userId} is not the owner of league with id ${leagueId}` };
        }
        if (!league.member_players.includes(playerId) && !league.invited_players.includes(playerId) && !league.requesting_players.includes(playerId)) {
            return res.status(404).json({ success: false, message: `Player with ID ${playerId} is not in the league` });
        }

        if(league.member_players.includes(playerId)){
            league.member_players.pull(playerId)
            await league.save()
        }
        else if(league.invited_players.includes(playerId)){
            league.invited_players.pull(playerId)
            await league.save()
        }
        else{
            league.requesting_players.pull(playerId)
            await league.save()
        }
        return res.status(200).json({ success: true, message: `Player with ${playerId} removed from league with id ${league._id}`})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

const verifyLeagueAndPlayers = async (req) => {
    const { leagueId, players } = req.body;

    if (!leagueId || !Array.isArray(players)) {
        return { success: false, message: "Please provide a valid leagueId and an array of players" };
    }

    try {
        const userPlayer = await Player.findOne({ user: req.userId})
        const league = await League.findById(leagueId)

        if (!userPlayer) {
            return { success: false, message: `Player with user id ${req.userId} not found` };
        }
        if (!league) {
            return { success: false, message: `League with id ${leagueId} not found` };
        }
        if(league.owner !== userPlayer._id){
            return { success: false, message: `Player with user id ${req.userId} is not the owner of league with id ${leagueId}` };
        }

        const verifiedPlayers = [];
        const invalidPlayers = [];

        for (const playerId of players) {
            const playerIdStr = String(playerId).trim(); // Ensure it's a string

            if (mongoose.Types.ObjectId.isValid(playerIdStr) && await Player.exists({ _id: playerIdStr })) {
                verifiedPlayers.push(playerIdStr);
            } else {
                invalidPlayers.push(playerIdStr);
            }
        }

        return { success: true, userPlayer, league, verifiedPlayers, invalidPlayers };
    } catch (err) {
        console.error(err)
        return { success: false, message: "Server Error" };
    }
};