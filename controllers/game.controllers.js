
import { api, formatDate} from "../config/balldontlie_api.js"
export const loadGames = async (req, res) => {
    const currentDate = new Date()
    const month = 1000 * 60 * 60 * 24 * 30
    const monthFromNow = new Date(Date.now() + month)
    const formattedCurrentDate = formatDate(currentDate)
    const formattedMonthFromNow = formatDate(monthFromNow)
    
    try{
        const games = await api.get(`/games?start_date=${formattedCurrentDate}&?end_date=${formattedMonthFromNow}`)
        return res.status(200).json({ 'success': true, 'message': 'Games retrieved', 'data': games.data.data})
    }
    catch(err) {
        console.log(err)
        return res.status(500).json({ 'success': false, 'message': 'Server Error'})
    }
}