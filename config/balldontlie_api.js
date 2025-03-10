import axios from 'axios'
import dotenv from 'dotenv'

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
