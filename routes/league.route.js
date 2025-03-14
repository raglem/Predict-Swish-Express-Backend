import express from 'express'
import { createLeague, addPlayers, removePlayer, acceptLeagueInvite, sendLeagueJoinRequest, acceptJoinCodeRequest, getUpcomingGames } from '../controllers/league.controllers.js'

const leagueRouter = express.Router()

leagueRouter.get('/games-upcoming', getUpcomingGames)
leagueRouter.post('/create', createLeague)
leagueRouter.post('/add', addPlayers)
leagueRouter.post('/request', sendLeagueJoinRequest)
leagueRouter.patch('/accept-invite', acceptLeagueInvite)
leagueRouter.patch('/accept-request', acceptJoinCodeRequest)
leagueRouter.delete('/delete-player', removePlayer)
export default leagueRouter