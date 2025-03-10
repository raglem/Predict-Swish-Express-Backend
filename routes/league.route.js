import express from 'express'
import { createLeague, addPlayers, removePlayer } from '../controllers/league.controllers.js'

const leagueRouter = express.Router()

leagueRouter.post('/create', createLeague)
leagueRouter.post('/add', addPlayers)
leagueRouter.delete('/delete-player', removePlayer)
export default leagueRouter