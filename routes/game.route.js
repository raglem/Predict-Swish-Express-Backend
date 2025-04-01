import express from 'express'
import { getGames, loadGames, updateGames } from '../controllers/game.controllers.js'
import User from '../models/user.module.js'

const gameRouter = express.Router()

gameRouter.get("/load", loadGames)
gameRouter.get("/update", updateGames)
gameRouter.get("/", getGames)

export default gameRouter