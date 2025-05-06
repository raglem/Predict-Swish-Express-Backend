import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import schedule from 'node-schedule';
import { Server } from 'socket.io'

import { connectDB } from './config/db.js'
import verifyToken from './middleware/verifyToken.js'
import verifySocketToken from './middleware/verifySocketToken.js'
import userRouter from './routes/user.route.js'
import playerRouter from './routes/player.route.js'
import gameRouter from './routes/game.route.js'
import leagueRouter from './routes/league.route.js'
import teamRouter from './routes/team.route.js'
import predictionRouter from './routes/prediction.route.js'
import chatRouter from './routes/chat.route.js'

import { handleChatSocket } from './controllers/chat.controllers.js'
import { loadGames, updateGames, verifyGames } from './controllers/game.controllers.js';
import { updateAllBots } from './helpers/bots.helpers.js';
import { updateAllPredictions } from './helpers/prediction.helpers.js';
import Game from './models/game.module.js';

dotenv.config()

const app = express();
const PORT = process.env.PORT

app.get("/", async (req, res) => {
    const games = await Game.find({ date: { $gte: Date.now() } }).limit(5).sort({ date: 1})
    res.json({ "Welcome Message": "Welcome to the backend API of Predict & Swish!", games })
})

const server = http.createServer(app);
const io = new Server(server, {
    // Allow all origins, only for testing purposes
    cors: {
        origin: '*',
    }
});
io.use(verifySocketToken)
io.on('connection', socket => {
    handleChatSocket(socket, io)
})

app.use(cors())
app.use(express.json())
app.use('/users', userRouter)

app.use(verifyToken)
app.use('/players', playerRouter)
app.use('/games', gameRouter)
app.use('/leagues', leagueRouter)
app.use('/teams', teamRouter)
app.use('/predictions', predictionRouter)
app.use('/chat', chatRouter)

const startServer = async () => {
    try{
        await connectDB()
        console.log("Connected to MongoDB successfully")
        server.listen(PORT, () => {
            console.log(`Server is running successfully. ` + 
                        `App is running on http://localhost:${PORT}`)
        })
    }
    catch(err){
        console.log(err)
    }
}

startServer()

schedule.scheduleJob('0 0 * * *', async () => {
    try{
        const loadGamesJob = await loadGames();
        const updateGamesJob = await updateGames();
        const updateBotsJob = await updateAllBots();
        const verifyGamesJob = await verifyGames();
        const updatePredictionsJob = await updateAllPredictions();

        if(loadGamesJob.success){
            console.log("Games loaded successfully")
        }
        if(updateGamesJob.success){
            console.log("Games updated successfully")
        }
        if(updateBotsJob.success){
            console.log("Bots updated successfully")
        }
        if(verifyGamesJob.success){
            console.log("Games verified successfully")
        }
        if(updateAllPredictions.success){
            console.log("Games verified successfully")
        }
        if(loadGamesJob.success && updateGamesJob.success && updateBotsJob.success && verifyGamesJob.success && updatePredictionsJob.success){
            console.log("Scheduled jobs completed successfully")
        }
    }
    catch(err){
        console.log("Job Failed")
        console.log(err)
    }
});