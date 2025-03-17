import Player from '../models/player.module.js'
import League from '../models/league.module.js'

import mongoose from 'mongoose'
import { api } from '../config/balldontlie_api.js'
import User from '../models/user.module.js'
import Game from '../models/game.module.js'
import Team from '../models/team.module.js'
import LeagueMembership from '../models/leagueMembership.module.js'
import { formatGameForUser } from './game.controllers.js'

export const createLeague = async(req, res) => {
    const rawData = req.body
    let userPlayer;
    let team
    try {
        userPlayer = await Player.findOne({ user: req.userId });
        if (!userPlayer) {
            return res.status(404).json({ success: false, message: `Player with user id ${req.userId} not found` });
        }

        if (!rawData.name || !rawData.mode) {
            return res.status(400).json({ success: false, message: "Please provide all league fields" });
        }

        if (rawData.mode === "team") {
            if (!rawData.team) {
                return res.status(400).json({ success: false, message: "Please provide a team field" });
            }
            team = await Team.findOne({ name: rawData.team });
            if (!team) {
                return res.status(400).json({ success: false, message: "Not a valid team field" });
            }
        }

        const leagueExists = await League.exists({ name: rawData.name });
        if (leagueExists) {
            return res.status(400).json({ success: false, message: "League name already taken" });
        }

        const invitedPlayers = rawData.invited_players || [];
        const verifiedInvitedPlayers = [];
        for (const playerId of invitedPlayers) {
            if (mongoose.Types.ObjectId.isValid(playerId) && await Player.exists({ _id: playerId })) {
                verifiedInvitedPlayers.push(playerId);
            } else {
                return res.status(400).json({ success: false, message: `Invalid player ID in invited_players: ${playerId}` });
            }
        }

        const leagueData = {
            owner: userPlayer._id,
            ...rawData,
            team: team ? team._id : undefined,
            member_players: [],
            requesting_players: [],
            invited_players: verifiedInvitedPlayers
        };

        const newLeague = new League(leagueData);
        await newLeague.save();
        return res.status(201).json({ success: true, data: leagueData });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
}
export const getLeagues = async (req, res) => {
    try{
        const player = await Player.findOne({ user: req.userId})
        const retrievedLeagues = await League.find({ 
            $or: [
                { owner: player._id },
                { member_players: player._id }
            ]
        });
        const leagues = await Promise.all(retrievedLeagues.map(async league => {
            const upcoming_games = await upcomingGames(league._id)
            /*
                upcoming_games = { succcess, games: [game1, game2, ...] }
            */
            return {
                id: league._id,
                balldontlie_id: league.balldontlie_id,
                upcoming_games: upcoming_games.success ? upcoming_games.games : []
            }
        }))
        return res.status(200).json({ success: true, message: 'Leagues retrieved successfully', data: leagues })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}
async function upcomingGames(leagueId){
    try{
        let games
        const league = await League.findById(leagueId)

        const start = new Date()
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
        const { startYear, startMonth, startDay } = { 
            startYear: String(start.getFullYear()),
            startMonth: String(start.getMonth()+1).padStart(2, '0'), 
            startDay: String(start.getDate()).padStart(2, '0')
        }
        const { endYear, endMonth, endDay } = {
            endYear: String(end.getFullYear()),
            endMonth: String(end.getMonth()+1).padStart(2, '0'),
            endDay: String(end.getDate()).padStart(2, '0')
        }
        const todayDateString = `${startYear}-${startMonth}-${startDay}T00:00:00.000Z`
        const nextWeekDateString = `${endYear}-${endMonth}-${endDay}T00:00:00.000Z`
        
        if(!league){
            return { success: false, message: `League with id ${leagueId} not found` }
        }
        if(league.mode === 'classic'){
            games = await Game.find({ 
                date: {
                    $gte: new Date(todayDateString), 
                    $lte: new Date(nextWeekDateString) 
                }
            }).sort({ balldontlie_id: 1 }).limit(20)
        }
        if(league.mode === 'team'){
            const team = await Team.findById(league.team)
            games = await Game.find({ 
                date: {
                    $gte: new Date(todayDateString), 
                    $lte: new Date(nextWeekDateString) 
                },
                $or: [{ away_team: team._id }, { home_team: team._id }]
            }).sort({ balldontlie_id: 1}).limit(20)
        }
        games = await Promise.all(games.map(async game => {
            const formattedGame = await formatGameForUser(game)
            if(formattedGame.success){
                /*
                    formattedGame = { success, formatted }
                */
                return formattedGame.formatted
            }
            return null
        }))
        return { success: true, games: games.filter(game => game !== null) }
    }
    catch(err){
        console.log(err)
        return { success: false, games: [], message: 'Server Error'}
    }
}

export const addPlayers = async (req, res) => {
    try {
        const verifiedData = await verifyLeagueAndPlayers(req);

        if (!verifiedData.success) {
            return res.status(400).json(verifiedData);
        }

        //retrieve league object and ids of existing players
        const { league, verifiedPlayers } = verifiedData
        const allPlayers = [...league.member_players, ...league.invited_players, ...league.requesting_players].map(p => p.toString()); //cast to String for includes() check

        const playersAlreadyInLeague = verifiedPlayers.filter(player => allPlayers.includes(player.toString()));
        const invited_players = verifiedPlayers.filter(player => !allPlayers.includes(player.toString()));

        if(invited_players.length > 0){
            league.invited_players.push(...invited_players)
            for(const playerId of invited_players){
                await LeagueMembership.create({
                    player: playerId,
                    league: league._id,
                    games: [],
                    predictions: [],
                })
            }
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
//for player to accept invite from league
export const acceptLeagueInvite = async(req, res) => {
    if(!req.body.league){
        return res.status(400).json({ success: false, message: 'Please provide a league field' })
    }
    try{
        const player = await Player.findOne({ user: req.userId})
        const league = await League.findOne({ _id: req.body.league })
        if(!player){
            return res.status(404).json({ success: false, message: `Player with user id ${req.userId} not found` })
        }
        if(!league){
            return res.status(404).json({ success: false, message: `League with id ${req.body.league} not found` })
        }
        if(player in league.invited_players.map(p => p.toString())){
            return res.status(404).json({ success: false, message: `Player with id ${player._id} is not in invited_players in league with id ${league._id}` })
        }
        league.invited_players.pull(player._id)
        league.member_players.push(player._id)
        await league.save()
        return res.status(200).json({ success: true, message: `Player with id ${player._id} successfully added to member_players in league with id ${league._id}` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}
export const sendLeagueJoinRequest = async(req, res) => {
    if(!req.body.joinCode){
        return res.status(400).json({ success: false, message: 'Please provide a join code field' })
    }
    try{
        const player = await Player.findOne({ user: req.userId })
        const league = await League.findOne({ join_code: req.body.joinCode })
        if(!player){
            return res.status(404).json({ success: false, message: `Player with id ${player._id} not found` })
        }
        if(!league){
            return res.status(404).json({ success: false, message: `League with join code ${req.body.joinCode} not found` })
        }
        if(player._id.toString() in [...league.member_players, ...league.invited_players, ...league.requesting_players].map(p => p.toString())){
            return res.status(400).json({ success: false, message: `Player with id ${player._id} is either already a member of league with id ${league._id} or has requested or been invited to join` })
        }
        league.requesting_players.push(player._id)
        await league.save()
        return res.status(200).json({ success: true, message: `Player with id ${player._id} successfully added to requesting_players in league with id ${league._id}` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}
export const acceptJoinCodeRequest = async(req, res) => {
    if(!req.body.playerId){
        return res.status(400).json({ success: false, message: 'Please provide a playerId field to accept into the league'})
    }
    if(!req.body.leagueId){
        return res.status(400).json({ success: false, message: 'Please provide a leagueId field'})
    }
    try{
        const league = await League.findOne({ _id: req.body.leagueId })
        const leagueOwner = await Player.findOne({ user: req.userId })
        const player = await Player.findOne({ _id: req.body.playerId })
        if(!league){
            return res.status(404).json({ success: false, message: `League with id ${req.body.leagueId} not found` })
        }
        if(!player){
            return res.status(404).json({ success: false, message: `Player with id ${req.body.playerId} not found` })
        }
        if(!leagueOwner){
            return res.status(404).json({ success: false, message: `Player with user id ${req.userId} not found` })
        }
        if(league.owner.toString !== leagueOwner._id.toString()){
            return res.status(403).json({ success: false, message: `Player with id ${req.body.playerId} is not the owner of league with id ${req.body.leagueId}` })
        }
        
        if(!(player._id in league.requesting_players.map(p => p.toString()))){
            return res.status(400).json({ success: false, message: `Player with id ${req.body.playerId} is not in requesting_players of league with id ${req.body.leagueID}`})
        }
        league.requesting_players.pull(player._id)
        league.member_players.push(player._id)
        await league.save()
        return res.status(200).json({ success: true, message: `Player with id ${player._id} successfully added to league with id ${league._id}` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
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

        if(!userPlayer) {
            return { success: false, message: `Player with user id ${req.userId} not found` };
        }
        if(!league) {
            return { success: false, message: `League with id ${leagueId} not found` };
        }
        if(league.owner.toString() !== userPlayer._id.toString()){
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