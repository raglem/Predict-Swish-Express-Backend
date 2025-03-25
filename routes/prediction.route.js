import express from 'express'
import { getPredictions, submitPrediction } from '../controllers/prediction.controllers.js'

const predictionRouter = express.Router()
predictionRouter.get("/", getPredictions)
predictionRouter.post("/", submitPrediction)

export default predictionRouter