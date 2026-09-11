import dns from "dns"

dns.setServers(["1.1.1.1", "8.8.8.8"]);



import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config(
    {
    path:"./.env"
 }


 

);

connectDB().then(()=>{
     app.on("error",(error)=>{
             console.log("error:",error);
             throw error;
          })
      app.listen(process.env.PORT||8000,()=>{
             console.log(`app is listening on ${process.env.PORT}`);
          })
})
.catch((err)=>{
    console.log("MONGODB CONNECTION FAILED!!",err);

})












































// import express from "express"
// const app=express();
// ;( async()=>{
//     try{

//          await mongoose.connect( `${Process.env.MONGO_URI}/ ${DB_NAME }`)

//          app.on("error",()=>{
//             console.log("error:",error);
//             throw error;
//          })

//          app.listen(process.env.PORT,()=>{
//             console.log(`app is listening on ${process.env.PORT}`);
//          })



//     }catch(error){
//         console.error("err:",error)
//         throw err;

//     }

// })()