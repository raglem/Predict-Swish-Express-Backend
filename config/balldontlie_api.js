import axios from 'axios'
import dotenv from 'dotenv'
import Team from '../models/team.module.js'

dotenv.config()

export const api = axios.create({
        baseURL: 'https://api.balldontlie.io/v1',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.BALLDONTLIE_API_KEY
        }
    })

export const formatDate = (date) => {
    if(date instanceof Date){
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return 'Invalid Date'
}

export const formatGame = async (game) => {
    console.log(game)
    try{
        const away_team = await Team.findOne({ balldontlie_id: game.visitor_team.id })
        const home_team = await Team.findOne({ balldontlie_id: game.home_team.id })
        const status = getStatus(game)
        const formatted = {
            balldontlie_id: game.id,
            date: new Date(game.date),
            status: status,
            season: game.season,
            away_team: away_team._id,
            home_team: home_team._id,
            away_team_score: game.visitor_team_score,
            home_team_score: game.home_team_score,
        }
        return { success: true, formatted }
    }
    catch(err){
        console.log(err)
        return { success: false, message: err.message }
    }

    function getStatus(game){
        if(game.status === 'Final'){
            return 'Final'
        }
        if(game.status === '1st Qtr' || game.status === '2nd Qtr' 
            || game.status === '3rd Qtr' || game.status === '4th Qtr')
        {
            return 'Pending'
        }
        return 'Upcoming'
    }
}
