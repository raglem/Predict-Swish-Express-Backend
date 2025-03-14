import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import verifyToken from './middleware/verifyToken.js'
import userRouter from './routes/user.route.js'
import playerRouter from './routes/player.route.js'
import gameRouter from './routes/game.route.js'
import leagueRouter from './routes/league.route.js'
import teamRouter from './routes/team.route.js'

import { api } from './config/balldontlie_api.js'
import Game from './models/game.module.js'

dotenv.config()

const app = express();
const PORT = process.env.PORT

app.use(cors())
app.use(express.json())
app.use('/users', userRouter)

app.use(verifyToken)
app.use('/players', playerRouter)
app.use('/games', gameRouter)
app.use('/leagues', leagueRouter)
app.use('/teams', teamRouter)


app.listen(PORT, (err) => {
    if(!err){
        console.log(`Server is running successfully. ` + 
                    `App is running on http://localhost:${PORT}`)
        connectDB()
    }
    else{
        console.log(err)
    }
})

app.get("/", (req, res) => {
    res.status(200)
    res.send("Welcome to root URL of Server")
})

app.post("/", (req, res) => {
    const num1 = req.body["num1"]
    const num2 = req.body["num2"]
    const answer = Number(num1) + Number(num2)
    res.send(`${num1} + ${num2} = ${answer}`)
})

// run()
// async function run() {
//     try{
//         const response = await api.get(`/games?dates[]=2025-03-12`)
//         console.log(response.data.data)
//     }
//     catch(err){
//         console.log(err)
//     }
// }
