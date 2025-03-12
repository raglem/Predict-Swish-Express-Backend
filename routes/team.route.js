import express from 'express'
import { loadTeams } from '../controllers/team.controllers.js'

const teamRouter = express.Router()
teamRouter.get("/load", loadTeams)

export default teamRouter