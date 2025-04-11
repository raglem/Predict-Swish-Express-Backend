import jwt from 'jsonwebtoken'

const verifySocketToken = (socket, next) => {
    const token = socket.handshake.auth?.token

    if(!token){
        return next(new Error('JWT Authencation: No Token'))
    }
    
    try{
        const decoded = jwt.decode(token, process.env.SECRET_KEY)
        const { userId } = decoded
        socket.userId = userId
        next()
    }
    catch(err){
        return next(new Error('JWT Authencation: Invalid Token'))
    }
}
export default verifySocketToken