import Player from '../models/player.module.js'
import League from '../models/league.module.js'

import mongoose from 'mongoose'
import { api } from '../config/balldontlie_api.js'
import User from '../models/user.module.js'
import Game from '../models/game.module.js'
import Team from '../models/team.module.js'
import Prediction from '../models/prediction.module.js'
import { upcomingGames, recentGames, getLeaderboard } from '../helpers/league.helpers.js'
import { VALID_BOT_NAMES, updateBot } from '../helpers/bots.helpers.js'

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
            member_players: [userPlayer._id],
            requesting_players: [],
            invited_players: verifiedInvitedPlayers,
        };

        const newLeague = new League(leagueData);
        await newLeague.save();
        return res.status(201).json({ success: true, data: leagueData });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
}
export const getLeague = async(req, res) => {
    const { leagueId } = req.params;

    if (!leagueId) {
        return res.status(400).json({ success: false, message: 'Please provide a leagueId parameter' });
    }

    try {
        const league = await League.findOne({ _id: leagueId })
        if (!league) {
            return res.status(404).json({ success: false, message: `League with id ${leagueId} not found` });
        }
        const member_players = await Promise.all(league.member_players.map(async playerId => {
            const player = await Player.findById(playerId).select('user')
            const user = await User.findById(player.user).select('username')
            return {
                id: playerId,
                name: user.username,
            }
        }))
        const invited_players = await Promise.all(league.invited_players.map(async playerId => {
            const player = await Player.findById(playerId).select('user')
            const user = await User.findById(player.user).select('username')
            return {
                id: playerId,
                name: user.username,
            }
        }))
        const requesting_players = await Promise.all(league.requesting_players.map(async playerId => {
            const player = await Player.findById(playerId).select('user')
            const user = await User.findById(player.user).select('username')
            return {
                id: playerId,
                name: user.username,
            }
        }))
        const team = league.mode === 'team' ? await Team.findById(league.team).select('name') : {}
        return res.status(200).json({ success: true, data: { 
            ...league.toObject(), 
            id: league._id, 
            member_players, 
            invited_players, 
            requesting_players,
            team: team?.name
        }});
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
            const ownerPlayer = await Player.findById(league.owner).select('user')
            const ownerUser = await User.findById(ownerPlayer.user).select('username')
            const upcoming_games = await upcomingGames(league._id)
            const recent_games = await recentGames(league._id, player._id)
            const leaderboard = await getLeaderboard(league._id, req.userId)
            const team = league.mode === 'team' ? await Team.findById(league.team) : null

            return {
                id: league._id,
                owner: {
                    id: league.owner,
                    username: ownerUser.username
                },
                balldontlie_id: league.balldontlie_id,
                name: league.name,
                mode: league.mode.charAt(0).toUpperCase() + league.mode.slice(1),
                team: team?.name,
                upcoming_games: upcoming_games.success ? upcoming_games.games : [],
                recent_games: recent_games.success ? recent_games.games : [],
                leaderboard: leaderboard.success ? leaderboard.players: [],
            }
        }))
        let owned_leagues = leagues.filter(league => league.owner.id.toString() === player._id.toString())
        owned_leagues = await Promise.all(owned_leagues.map(async owned_league => {
            const league = await League.findById(owned_league.id)
            const totals = await Promise.all(league.member_players.map(async playerId => {
                const predictions = await Prediction.find({ player: playerId, leagues: league._id }).populate('score');
                const player_total_score = predictions.reduce((sum, prediction) => sum + (prediction.score || 0), 0);
                return {
                    total_games_of_player: predictions.length,
                    total_score_of_player: player_total_score,
                    average_score_of_player: player_total_score / predictions.length || 0,
                }
            }))
            const { total_games_played, total_score_of_all_games, total_of_average_player_score_per_game } = totals.reduce((sum, player) => {
                sum.total_games_played += player.total_games_of_player;
                sum.total_score_of_all_games += player.total_score_of_player;
                sum.total_of_average_player_score_per_game += player.average_score_of_player;
                return sum;
            }, { total_games_played: 0, total_score_of_all_games: 0, total_of_average_player_score_per_game: 0 })
            const average_game_score = parseFloat((total_of_average_player_score_per_game / league.member_players.length || 0).toFixed(2))

            const invited_players = await Promise.all(league.invited_players.map(async playerId => {
                const player = await Player.findById(playerId).select('user')
                const user = await User.findById(player.user).select('username')
                return {
                    id: playerId,
                    name: user.username,
                }
            }))
            const requesting_players = await Promise.all(league.requesting_players.map(async playerId => {
                const player = await Player.findById(playerId).select('user')
                const user = await User.findById(player.user).select('username')
                return {
                    id: playerId,
                    name: user.username,
                }
            }))
            return {
                ...owned_league,
                invited_players,
                requesting_players,
                stats: {
                    total_players: league.member_players.length,
                    total_games_played,
                    total_score_of_all_games,
                    average_game_score,
                }
            }
        }))
        return res.status(200).json({ success: true, message: 'Leagues retrieved successfully', leagues, owned_leagues })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}
export const getLeaguesInvites = async (req, res) => {
    try{
        const player = await Player.findOne({ user: req.userId })
        const member_leagues = await League.find({ member_players: player._id }).select('_id name')
        const invited_leagues = await League.find({ invited_players: player._id }).select('_id name')
        const requesting_leagues = await League.find({ requesting_players: player._id }).select('_id name')
        const data = {
            member_leagues: member_leagues.map(league => ({ ...league.toObject(), id: league._id })),
            invited_leagues: invited_leagues.map(league => ({ ...league.toObject(), id: league._id })),
            requesting_leagues: requesting_leagues.map(league => ({ ...league.toObject(), id: league._id })),
        }
        return res.status(200).json({ success: true, data })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}
// only meant to update name, mode, and team fields
export const updateLeague = async (req, res) => {
    const { leagueId } = req.params

    try{
        const league = await League.findById(leagueId)
        let change = false
        if(req.body.name && req.body.name !== league.name){
            league.name = req.body.name
            change = true
        }
        if (req.body.mode && req.body.mode.toLowerCase() !== league.mode && (req.body.mode.toLowerCase() === "classic" || req.body.mode.toLowerCase() === "team")) {
            league.mode = req.body.mode.toLowerCase();
            change = true;
        }
        if(req.body.mode.toLowerCase() === 'team' && req.body.team && req.body.team !== league.team){
            const team = await Team.findOne({ name: req.body.team }).select('_id')
            league.team = team.id
            change = true
        }
        if(change){
            await league.save()
        }
        return res.status(200).json({ success: true, message: `League with id ${league._id} successfully saved` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
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

        league.invited_players.push(...invited_players)
        await league.save()

        const usernames = await Promise.all(invited_players.map(async playerId => {
            const player = await Player.findById(playerId).select('user')
            const user = await User.findById(player.user).select('username')
            return user.username
        }))
        usernames.forEach(username => {
            if(VALID_BOT_NAMES.includes(username)){
                updateBot(username)
            }
        })
        
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
        if(league.owner.toString() !== userPlayer._id.toString()){
            return res.status(404).json({ success: false, message: `Player with user id ${req.userId} is not the owner of league with id ${req.body.leagueId}` })
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
export const removeCurrentPlayer = async(req, res) => {
    if(!req.body.leagueId){
        return res.status(400).json({ success: false, message: 'Please provide leagueId field'})
    }

    try{
        const player = await Player.findOne({ user: req.userId})
        const playerId = player._id
        const league = await League.findById(req.body.leagueId)
    
        if(!league){
            return res.status(404).json({ success: false, message: `League with ${req.body.leagueId} not found`})
        }
        if(!player){
            return res.status(404).json({ success: false, message: `Player with ${playerId} not found`}) 
        }
        if (!league.member_players.includes(playerId) && !league.invited_players.includes(playerId) && !league.requesting_players.includes(playerId)) {
            return res.status(404).json({ success: false, message: `Player with id ${playerId} is not in the league` });
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
        return res.status(200).json({ success: true, message: `Current player with ${playerId} removed from league with id ${league._id}`, data: { name: league.name }})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}
//for player to accept invite from league
export const acceptLeagueInvite = async(req, res) => {
    if(!req.body.leagueId){
        return res.status(400).json({ success: false, message: 'Please provide a league field' })
    }
    try{
        const player = await Player.findOne({ user: req.userId})
        const league = await League.findOne({ _id: req.body.leagueId })
        if(!player){
            return res.status(404).json({ success: false, message: `Player with user id ${req.userId} not found` })
        }
        if(!league){
            return res.status(404).json({ success: false, message: `League with id ${req.body.leagueId} not found` })
        }
        if(!league.invited_players.map(player => player.toString()).includes(player._id.toString())){
            return res.status(404).json({ success: false, message: `Player with id ${player._id} is not in invited_players in league with id ${league._id}` })
        }
        league.invited_players.pull(player._id)
        league.member_players.push(player._id)
        await league.save()
        return res.status(200).json({ 
            success: true, 
            message: `Player with id ${player._id} successfully added to member_players in league with id ${league._id}`, 
            data: { id: league._id, name: league.name }
        })
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
        const playerId = player._id
        const league = await League.findOne({ join_code: req.body.joinCode })
        if(!player){
            return res.status(404).json({ success: false, message: `Player with id ${player._id} not found` })
        }
        if(!league){
            return res.status(404).json({ success: false, message: `League with join code ${req.body.joinCode} not found`, userMessage: `League with join code ${req.body.joinCode} not found` })
        }
        const all_players = [...league.member_players, ...league.invited_players, ...league.requesting_players].map(player => player.toString())
        if(all_players.includes(playerId.toString())){
            return res.status(400).json({ 
                success: false, 
                message: `Player with id ${player._id} is either already a member of league with id ${league._id} or has requested or been invited to join`,
                userMessage: "You're already part of this league. If you are not a member, you have already sent an request or been invited"
            })
        }
        league.requesting_players.push(player._id)
        await league.save()
        return res.status(200).json({ 
            success: true, 
            message: `Player with id ${player._id} successfully added to requesting_players in league with id ${league._id}`, 
            data: { id: league._id, name: league.name }
        })
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
export const deleteLeague = async(req, res) => {
    if(!req.body.leagueId){
        return res.status(400).json({ success: false, message: 'Please provide a leagueId field' })
    }
    try{
        const league = await League.findById(req.body.leagueId);
        if (!league) {
            return res.status(404).json({ success: false, message: `League with id ${req.body.leagueId} not found` });
        }
        await league.deleteOne();
        return res.status(204).json({ success: true, message: `League with id ${req.body.leagueId} deleted` })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
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