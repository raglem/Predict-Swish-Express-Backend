import { api } from "../config/balldontlie_api.js"
import Team from "../models/team.module.js"
export const loadTeams = async(req, res) => {
    try{
        const teams = await api.get(`https://api.balldontlie.io/v1/teams`)
        for(let i=0; i<30; i++){ //load the 30 current nba teams
            const retrievedTeam = teams.data.data[i]
            const existingTeam = await Team.findOne({ balldontlie_id: retrievedTeam.id })
            if(!existingTeam){
                const formattedTeam = {
                    balldontlie_id: retrievedTeam.id,
                    city: retrievedTeam.city,
                    name: retrievedTeam.name,
                    abbreviation: retrievedTeam.abbreviation,
                }
                const team = Team(formattedTeam)
                await team.save()
            }
        }
        return res.status(200).json({ success: true, message: 'Successfully loaded team' })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}