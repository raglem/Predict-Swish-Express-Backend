import express from 'express'
import { getGames, loadGames, updateGames, verifyGames } from '../controllers/game.controllers.js'
import User from '../models/user.module.js'

const gameRouter = express.Router()

gameRouter.get("/", getGames)
gameRouter.get("/verify", verifyGames)
// gameRouter.get("/load", loadGames)
// gameRouter.get("/update", updateGames)

export default gameRouter