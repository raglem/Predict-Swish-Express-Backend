import express from 'express'
import { loadGames, updateGames } from '../controllers/game.controllers.js'
import User from '../models/user.module.js'

const gameRouter = express.Router()

gameRouter.get("/load", loadGames)
gameRouter.get("/update", updateGames)

export default gameRouter