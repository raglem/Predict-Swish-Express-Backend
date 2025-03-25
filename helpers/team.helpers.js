import Team from '../models/team.module.js'
export const getTeam = async id => {
    const team = await Team.findById(id).select('name')
    return team.name
}