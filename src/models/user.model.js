import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

 const userschema =new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true

    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true

    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true

    },
    avatar:{
        type:String,
        required:true,
    },
    coverimage:{
        type:String
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"video"
        }
    ],

    password:{
        type:String,
        required:[true,'password is requied']
    },
     refreshToken:{
        type:String
     }

 },{timestamps:true})



 userschema.pre("save", async function () {
    if(!this.isModified("password")) return ;
    this.password= await bcrypt.hash(this.password,10)
    
    
 })


 userschema.methods.ispasswordcorrect=async function (password) {

    return await bcrypt.compare(password,this.password)
    
 }

 userschema.methods.generateAcessToken=function(){
    console.log("access");
    
     return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
 }

  userschema.methods.generateRefreshToken=function(){
     return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
 }


 export const user=mongoose.model("user",userschema)