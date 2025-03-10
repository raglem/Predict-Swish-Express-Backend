import mongoose from 'mongoose'

export const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`Connected to MongoDB: ${conn.connection.host}`)
    }
    catch(err){
        console.log("Something went wrong. ")
        console.log(err)
        process.exit(1)
    }
}