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
import { loadGames, updateGames } from './controllers/game.controllers.js'

dotenv.config()

const app = express();
const PORT = process.env.PORT

const server = http.createServer(app);
const io = new Server(server, {
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


server.listen(PORT, (err) => {
    if(!err){
        console.log(`Server is running successfully. ` + 
                    `App is running on http://localhost:${PORT}`)
        connectDB()
    }
    else{
        console.log(err)
    }
})

schedule.scheduleJob('0 0 * * *', async () => {
    await loadGames();
    await updateGames();
});

