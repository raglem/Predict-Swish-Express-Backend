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
import predictionRouter from './routes/prediction.route.js'

import { updatePredictions } from './helpers/prediction.helpers.js'

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
app.use('/predictions', predictionRouter)


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


// run()
// async function run() {
//     try{
//         const response = await updatePredictions('67e20066195db28d372e192b')
//         console.log(response)
//     }
//     catch(err){
//         console.log(err)
//     }
// }
