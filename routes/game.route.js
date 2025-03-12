import express from 'express'
import { loadGames } from '../controllers/game.controllers.js'
import User from '../models/user.module.js'

const gameRouter = express.Router()

gameRouter.get("/load", loadGames)

export default gameRouter