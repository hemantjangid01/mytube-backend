import mongoose from "mongoose";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { user } from "../models/user.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

import jwt from "jsonwebtoken";
import { video } from "../models/video.model.js";
const generateaccesandrefreshtoken=async(userid)=>{
    try {
        const uuser=await user.findById(userid);
        const accessToken= await uuser.generateAcessToken();
        console.log("generated");
        const refreshToken= await uuser.generateRefreshToken();
        console.log("generated");

        uuser.refreshToken=refreshToken;
        console.log("generated0");
         await uuser.save({validateBeforeSave:false});
         console.log("generated1");




        return {accessToken,refreshToken}


        
    } catch (error) {
        throw new ApiError(" error during token generation",error)
        
    }
}
const registerUser=asynchandler(async(req,res)=>{
      const {fullname,email,username,password}=req.body;
      if([fullname,email,username,password].some((field)=>
    field?.trim()==="")){
        throw new ApiError(400,"all feilds are required")
    }

     const ExistedUser= await user.findOne({
        $or: [{
            username
        },{
            email
        }]
    })

    if (ExistedUser) {
        throw  new ApiError(409,"user with email or username exist")
        
    }


    const avatarLocalpath=req.files?.avatar[0]?.path;
  

    let coverImageLocalpath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
        coverImageLocalpath=req.files?.coverImage[0]?.path;

    }
    if(!avatarLocalpath){
        throw new ApiError(400,"avatar required")
    }


   const avatar = await  uploadOnCloudinary(avatarLocalpath)
     const coverimage= await  uploadOnCloudinary(coverImageLocalpath)

     if(!avatar){
        throw new ApiError(500," Failed to upload avatar")
    }

     const uuser =await user.create({
        fullname:fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email:email,
        password:password,
        username:username.toLowerCase()
    })

    const createdUser=await user.findById(uuser._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500," something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"user registerd successfully")
    )






})

const loginUser=asynchandler(async(req,res )=>{

    const{username,email,password}=req.body;

    if(!username && !email){
        throw new ApiError(400, "email or username is required");
    }

        const currUser =  await user.findOne({
        $or:[
           {username},
            {email}]
        }
    )

    if(!currUser){
        throw new ApiError(404,"user not registered")
    }


    const ispasswordValid=await currUser.ispasswordcorrect(password);

    if(!ispasswordValid){
         throw new ApiError(404,"Invalid credentials")
    }

    console.log("ok till here");

     const {accessToken,refreshToken}=await generateaccesandrefreshtoken(currUser._id);
      

     const loggedInUser= await user.findById(currUser._id).select("-password -refreshToken")
     const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
};

      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
     new ApiResponse(
        200,
        {
            user: loggedInUser,
            accessToken,
            refreshToken
        },
        "user loggedin successfully"
    )
)








})
 const logOutUser=asynchandler(async(req,res)=>{

    await user.findByIdAndUpdate(

    req.user._id,

    
    {
        $unset:{
            refreshToken:undefined
        },
        
    },
    {
            new:true
        }
    )
     const options={
        httpOnly:true,
        secure:true,

     }
     return res.status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"user logged out"))
 })
const refreshAccessToken=asynchandler(async(req,res)=>{
    const incomingrefreshToken=req.cookies.refreshToken||req.body.refreshToken

    if(!incomingrefreshToken){
        throw new ApiError(
            401,"unauthorised request   "
        )
    }

  try {
     const decodedToken= jwt.verify(incomingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
     const uuser=await user.findById(decodedToken?._id)
  
  
      if(!uuser){
          throw new ApiError(
              401,"invalid refreshtoken"
          )
      }
  
      if(incomingrefreshToken!==uuser?.refreshToken){
          throw new ApiError(
              401,"refreshtoken expired or used"
          )
      }
      const options={
          httpOnly:true,
          secure:true
      }
  
      const {accessToken,newrefreshToken}=await generateaccesandrefreshtoken(uuser._id);
  
  
      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newrefreshToken,options)
      .json(
          new ApiResponse(
              200,
              {
                  accessToken,refreshToken:newrefreshToken
              },
              "access token refreshed"
          )
      )
  } catch (error) {
    throw new ApiError(401,error?.message||"imvalid refresh token")
    
  }



})
const changePassword=asynchandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;

    const uuser=await user.findById(req.user?._id)
    const ispasswordcorrect=uuser.ispasswordcorrect(oldPassword)
    if(!ispasswordcorrect){
        throw new ApiError(404,"invalid old password")
    }

            uuser.password=newPassword
            await uuser.save({validateBeforeSave:false})

            return res.status(200)
            .json( new ApiResponse(200,{},"password changed successfully"))
            
})
const getCurrentuser=asynchandler(async(req,res)=>{
     console.log("ok h ");
    
    return res
    .status(200)
    .json( new ApiResponse(200,  req.user,"current user fetched successfully"))
})
const updateAccountdetails=asynchandler(async(req,res)=>{
    const{fullname,email}=req.body;
    if(!fullname||!email){
        throw new ApiError(400,"all fields are required")
    }
    console.log("ok h ");

     const updatedUser=await user.findByIdAndUpdate( 
        req.user?._id,
    {
        $set:{
            fullname:fullname,
            email:email
        }

    },
    {
        new:true
    }
).select("-password")
console.log("ok h ");

    return res.status(200)
    .json(new ApiResponse(
        200,
        updatedUser,
        "account details updated successfully"
    ))
   

})
const updateUserAvatar=asynchandler(async(req,res)=>{
    const avatarLocalpath=req.file?.path
    if(!avatarLocalpath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalpath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading avatar")
    }


    const uuser=await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }

        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,uuser,"avatar image updated successfully")
    )



})
const updateUserCoverImage=asynchandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400," cover file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,"error while uploading coverImage")
    }


     const uuser=await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimage:coverImage.url
            }

        },
        {
            new:true
        }
    ).select("-password")


    return res.status(200)
    .json(
        new ApiResponse(200,uuser,"cover image updated successfully")
    )



})

const getUserChannelProfile=asynchandler(async(req,res)=>{
    const {username}=req.params;
    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }
    const channel=await user.aggregate([
        {
            $match:{
                username:username?.toLowerCase()   
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                 from: "subscriptions",
                localField: "_id",
                foreignField:"subscriber",
                as:"subscribedTo"

            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"

                    
                },
                channelsSubscribedToCount :{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }

                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel doesnot exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
        "user channel fetched successfully" 
      )
    )

})

// const getWatchHistory= asynchandler(async(req,res)=>{
//     const user=await user.aggregate([
//         {
//             $match:{
//                 _id:new mongoose.Types.ObjectId(req.user._id)

//             }
//         },
//         {
//             $lookup:{
//                 from:"videos",
//                 localField:"watchHistory",
//                 foreignField:"_id",
//                 as:"watchHistory",
//                 pipeline:[
//                     {
//                         $lookup:{
//                             from:"users",
//                             localField:"owner",
//                             foreignField:"_id",
//                             as:"owner",

//                             pipeline:{
//                                 $project:{
//                                     fullName:1,
//                                     username:1,
//                                     avatar:1

//                                 }
//                             }
                            
//                         }
//                     },
//                     {

//                         $addFields:{
//                             owner:{
//                                 $first:"$owner"
//                             }
//                         }

//                     }
//                 ]
//             }
//         }
//     ])

//     return res.status(200)
//     .json(
//         new ApiResponse(
//             200,
//             user[0].watchHistory,
//             "watch history fetched successfully"

//         )
//     )
// })

const addToWatchHistory = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId) {
        throw new ApiError(400, "videoId is required");
    }

    const videoo= await video.findById(videoId);

    if (!videoo) {
        throw new ApiError(404, "Video does not exist in db");
    }

    // Remove it first if it already exists
    await user.findByIdAndUpdate(
        userId,
        {
            $pull: {
                watchHistory: videoId
            }
        }
    );

    // Add it at the end as the latest watched video
    await user.findByIdAndUpdate(
        userId,
        {
            $push: {
                watchHistory: videoId
            }
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Watch history updated successfully"
        )
    );
});
const getWatchHistory = asynchandler(async (req, res) => {

    const uuser = await user.findById(req.user._id)
         .populate({
            path: "watchHistory",
            match: { isPublished: true },
            populate: {
                path: "owner",
                select: "fullname username avatar"
            }
        });

    if (!uuser) {
        throw new ApiError(404, "User does not exist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            uuser.watchHistory,
            "Watch history fetched successfully"
        )
    );
});
const clearWatchHistory = asynchandler(async (req, res) => {

    const uuser = await user.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                watchHistory: []
            }
        },
        {
            new: true
        }
    );

    if (!uuser) {
        throw new ApiError(404, "User does not exist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Watch history cleared successfully"
        )
    );
});




export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changePassword,
    getCurrentuser,
    updateAccountdetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    addToWatchHistory,
    clearWatchHistory
    
}