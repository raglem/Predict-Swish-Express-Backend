import mongoose from 'mongoose'

let cached = global.mongoose

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
    if(!process.env.MONGODB_URI){
        throw new Error("MONGODB URI is not defined in .env file")
    }

    try{
        if(cached.conn) return cached.conn

        if(!cached.promise){
            cached.promise = mongoose.connect(process.env.MONGODB_URI)
            .then((mongoose) => {
                return mongoose;
            })
        }

        cached.conn = await cached.promise
        return cached.conn

    }
    catch(err){
        console.log("Something went wrong. ")
        console.log(err)
        process.exit(1)
    }
}