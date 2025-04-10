import express from 'express'
import { getChat, sendMessage } from '../controllers/chat.controllers.js'

const chatRouter = express.Router()

chatRouter.get("/", getChat)
chatRouter.post("/", sendMessage)

export default chatRouter