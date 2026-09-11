import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import { user } from "../models/user.model.js";





export const verifyJWT=asynchandler(async(req,_,next)=>{
   try {
    const token = req.cookies?.accessToken||req.header("Authorisation")?.replace("Bearer ","");
    if(!token){
     throw new ApiError(401,"unauthorized request")
    }
 
    const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
    
 
    const uuser = await user.findById(decodedToken?._id)
    .select("-password -refreshToken" )
 
    if(!uuser){
     throw new ApiError(401,"invalid access token")
 
 
    }
    req.user=uuser;
    next();
 
   } catch (error) {

         throw new ApiError(401,error?.message||"invalid access token")
    
   }
   
})