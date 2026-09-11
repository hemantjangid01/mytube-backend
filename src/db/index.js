import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";




const connectDB=async ()=>{
    try{

          const connectioninstance=await mongoose.connect( `${process.env.MONGO_URI}`)

          console.log(`\n mongodb connected chote bhai !! DB HOST: ${connectioninstance.connection.host} `);
          return connectioninstance;

    }catch(error){
         console.error(" mondodb connection error:",error)
         throw error;
         process.exit(1);

    }
}

export default connectDB;