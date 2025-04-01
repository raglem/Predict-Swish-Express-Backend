import express from 'express'
import { acceptJoinCodeRequest, acceptLeagueInvite, addPlayers, createLeague, getLeagues, getLeaguesInvites, removeCurrentPlayer, removePlayer, sendLeagueJoinRequest } from '../controllers/league.controllers.js'

const leagueRouter = express.Router()

leagueRouter.get('', getLeagues)
leagueRouter.get('/invites', getLeaguesInvites)
leagueRouter.post('/create', createLeague)
leagueRouter.post('/add', addPlayers)
leagueRouter.post('/request', sendLeagueJoinRequest)
leagueRouter.patch('/accept-invite', acceptLeagueInvite)
leagueRouter.patch('/accept-request', acceptJoinCodeRequest)
leagueRouter.delete('/delete-player', removePlayer)
leagueRouter.delete('/delete-current-player', removeCurrentPlayer)
export default leagueRouter