import express from 'express'
import { getPredictions } from '../controllers/prediction.controllers.js'

const predictionRouter = express.Router()
predictionRouter.get("/", getPredictions)

export default predictionRouter