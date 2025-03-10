import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/user.module.js'
import Player from '../models/player.module.js'

export const register = async (req, res) => {
    const userData = req.body
    if(!userData.username || !userData.password){
        return res.status(400).json({ success: false, message: 'Please provide all user fields.' })
    }

    //check for existing user
    try{
        const existingUser = await User.findOne({ username: userData.username} )
        if(existingUser){
            return res.status(400).json({ success: false, message: 'Provided username already taken.' })
        }
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }

    const hashedUser = {
        username: userData.username,
        password: await bcrypt.hash(userData.password, 10)
    }
    const newUser = User(hashedUser)
    //save user and corresponding player
    try{
        await newUser.save()

        const playerData = {
            user: newUser._id,
            friends: [],
            sent_requests: [],
            leagues: [],
            predictions: []
        }

        const newPlayer = Player(playerData)
        await newPlayer.save()

        res.status(201).json({ success: true, message: 'User successfully created', data: {newUser: newUser, newPlayer: newPlayer}})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error'})
    }
}

export const login = async (req, res) => {
    const userData = req.body
    if(!userData.username || !userData.password){
        return res.status(400).json({ 'success': 'false', 'message': 'Please provide all user fields'})
    }

    const {username, password} = userData
    try{
        const user = await User.findOne( {'username': username} )
        if(!user){
            return res.status(401).json( { success: 'false', message: 'User not found'} )
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        if(!passwordMatch){
            return res.status(401).json({ success: 'false', message: 'Authentication failed. Passwords do not match.' })
        }

        const token = jwt.sign( {userId: user._id}, process.env.SECRET_KEY, {expiresIn: '1h'} )
        return res.status(201).json({ success: 'true', message: 'User authentication successful', token: token })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}