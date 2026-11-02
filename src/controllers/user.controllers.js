import mongoose from "mongoose";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { user } from "../models/user.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

import jwt from "jsonwebtoken";
import { video } from "../models/video.model.js";
import redisClient from "../db/redis.js";
import {
  createHash,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"; 
import sendEmail from "../utils/sendEmail.js";



const incrementWindowCounter = async (key, windowSeconds) => {
  const count = await redisClient.eval(
    `
      local count = redis.call("INCR", KEYS[1])

      if count == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end

      return count
    `,
    {
      keys: [key],
      arguments: [String(windowSeconds)],
    }
  );

  return Number(count);
};

const enforceRateLimit = async (
  key,
  limit,
  windowSeconds,
  message
) => {
  const count = await incrementWindowCounter(
    key,
    windowSeconds
  );

  if (count > limit) {
    throw new ApiError(429, message);
  }
};



const forgotPassword = asynchandler(async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  const responseMessage =
    "If an account exists with this email, an OTP has been sent.";

  // Maximum 10 requests per IP in 15 minutes.
  await enforceRateLimit(
    `password-reset:request:ip:${ip}`,
    10,
    900,
    "Too many OTP requests from this network. Try later."
  );

  // Maximum 3 requests per email in 15 minutes.
  await enforceRateLimit(
    `password-reset:request:email:${email}`,
    3,
    900,
    "Too many OTP requests for this email. Try later."
  );

  const cooldownKey = `password-reset:cooldown:${email}`;
  const otpKey = `password-reset:otp:${email}`;

  const allowed = await redisClient.set(
    cooldownKey,
    "1",
    { EX: 60, NX: true }
  );

  if (!allowed) {
    return res.status(200).json(
      new ApiResponse(200, {}, responseMessage)
    );
  }

  const existingUser = await user.findOne({ email });

  if (!existingUser) {
    return res.status(200).json(
      new ApiResponse(200, {}, responseMessage)
    );
  }

  const otp = randomInt(100000, 1000000).toString();

  const otpHash = createHash("sha256")
    .update(otp)
    .digest("hex");

  await redisClient.set(
    otpKey,
    JSON.stringify({
      userId: existingUser._id.toString(),
      otpHash,
      tokenVersion: existingUser.tokenVersion ?? 0,
    }),
    { EX: 300 }
  );

  try {
    await sendEmail({
      to: email,
      subject: "MyTube Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>MyTube Password Reset</h2>
          <p>Your password reset OTP is:</p>
          <h1 style="letter-spacing: 8px;">${otp}</h1>
          <p>This OTP expires in 5 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD EMAIL ERROR:", error);

    await redisClient.del(otpKey);
    await redisClient.del(cooldownKey);

    throw new ApiError(
      502,
      "Unable to send OTP. Try again later."
    );
  }

  return res.status(200).json(
    new ApiResponse(200, {}, responseMessage)
  );
});




const resetPassword = asynchandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const normalizedEmail =
    typeof email === "string"
      ? email.trim().toLowerCase()
      : "";

  if (!normalizedEmail || !otp || !newPassword) {
    throw new ApiError(
      400,
      "Email, OTP and new password are required"
    );
  }

  if (!/^\d{6}$/.test(String(otp))) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters"
    );
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // Overall verification limits.
  await enforceRateLimit(
    `password-reset:verify:ip:${ip}`,
    20,
    900,
    "Too many reset attempts from this network. Try later."
  );

  await enforceRateLimit(
    `password-reset:verify:email:${normalizedEmail}`,
    10,
    900,
    "Too many reset attempts for this email. Try later."
  );

  const otpKey = `password-reset:otp:${normalizedEmail}`;
  const attemptsEmailKey =
    `password-reset:attempts:email:${normalizedEmail}`;
  const attemptsIpKey =
    `password-reset:attempts:ip:${ip}`;
  const lockKey =
    `password-reset:lock:${normalizedEmail}`;

  const storedData = await redisClient.get(otpKey);

  if (!storedData) {
    throw new ApiError(
      400,
      "OTP expired or invalid. Request a new OTP."
    );
  }

  let otpData;

  try {
    otpData = JSON.parse(storedData);
  } catch {
    await redisClient.del(otpKey);
    throw new ApiError(400, "Invalid OTP data");
  }

  const {
    userId,
    otpHash: storedHash,
    tokenVersion: storedTokenVersion = 0,
  } = otpData;

  if (
    typeof storedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    await redisClient.del(otpKey);
    throw new ApiError(400, "Invalid OTP data");
  }

  const submittedHash = createHash("sha256")
    .update(String(otp))
    .digest("hex");

  const isOtpCorrect = timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );

  if (!isOtpCorrect) {
    const emailAttempts = await incrementWindowCounter(
      attemptsEmailKey,
      300
    );

    const ipAttempts = await incrementWindowCounter(
      attemptsIpKey,
      300
    );

    if (emailAttempts >= 5 || ipAttempts >= 20) {
      await redisClient.del(otpKey);
      await redisClient.del(attemptsEmailKey);
      await redisClient.del(attemptsIpKey);

      throw new ApiError(
        429,
        "Too many incorrect OTP attempts. Request a new OTP."
      );
    }

    throw new ApiError(400, "Incorrect OTP");
  }

  // Acquire a short-lived lock to prevent simultaneous resets.
  const lockValue = randomUUID();

  const lockAcquired = await redisClient.set(
    lockKey,
    lockValue,
    { EX: 30, NX: true }
  );

  if (!lockAcquired) {
    throw new ApiError(
      409,
      "Password reset is already being processed. Try again."
    );
  }

  let passwordSaved = false;

  try {
    const existingUser = await user.findById(userId);

    if (!existingUser) {
      await redisClient.del(otpKey);
      throw new ApiError(404, "User does not exist");
    }

    // Reject an OTP from an earlier password/session version.
    if (
      (existingUser.tokenVersion ?? 0) !==
      Number(storedTokenVersion)
    ) {
      await redisClient.del(otpKey);

      throw new ApiError(
        400,
        "OTP has already been used. Request a new OTP."
      );
    }

    // Save password and invalidate sessions in one MongoDB document save.
    existingUser.password = newPassword;
    existingUser.tokenVersion =
      (existingUser.tokenVersion ?? 0) + 1;

    existingUser.refreshToken = undefined;

    // The Mongoose pre-save hook hashes the new password.
    await existingUser.save();

    passwordSaved = true;

    // Delete OTP and counters only after MongoDB successfully saves.
    // Delete the lock only if this request still owns it.
    await redisClient.eval(
      `
        if redis.call("GET", KEYS[4]) == ARGV[1] then
          redis.call("DEL", KEYS[1])
          redis.call("DEL", KEYS[2])
          redis.call("DEL", KEYS[3])
          redis.call("DEL", KEYS[4])
          return 1
        end

        return 0
      `,
      {
        keys: [
          otpKey,
          attemptsEmailKey,
          attemptsIpKey,
          lockKey,
        ],
        arguments: [lockValue],
      }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "Password reset successfully. Please login again."
      )
    );
  } catch (error) {
    // If MongoDB did not save, preserve the OTP for a retry.
    // Release only the lock owned by this request.
    if (!passwordSaved) {
      await redisClient.eval(
        `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
          end

          return 0
        `,
        {
          keys: [lockKey],
          arguments: [lockValue],
        }
      );
    }

    throw error;
  }
});


const generateaccesandrefreshtoken=async(userid)=>{
    try {
        const uuser=await user.findById(userid);
        const accessToken= await uuser.generateAcessToken();
        
        const refreshToken= await uuser.generateRefreshToken();
        
        uuser.refreshToken=refreshToken;

         await uuser.save({validateBeforeSave:false});
    




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

if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
) {
    coverImageLocalpath = req.files.coverimage[0].path;
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
 const logOutUser = asynchandler(async (req, res) => {

    await user.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "user logged out"
            )
        );
});
const refreshAccessToken=asynchandler(async(req,res)=>{
    const incomingrefreshToken=req.cookies.refreshToken||req.body.refreshToken

    if(!incomingrefreshToken){
        throw new ApiError(
            401,"unauthorised request"
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
    throw new ApiError(401,error?.message||"invalid refresh token")
    
  }



})

const changePassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(
      400,
      "Old password and new password are required"
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(
      400,
      "New password must contain at least 8 characters"
    );
  }

  const currentUser = await user.findById(req.user._id);

  if (!currentUser) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordCorrect =
    await currentUser.ispasswordcorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must be different from old password"
    );
  }

  currentUser.password = newPassword;
  currentUser.tokenVersion =
    (currentUser.tokenVersion ?? 0) + 1;
  currentUser.refreshToken = undefined;

  await currentUser.save();

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please login again."
      )
    );
});

const getCurrentuser=asynchandler(async(req,res)=>{
    
    
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
    const existingUser = await user.findOne({
    email: email.trim().toLowerCase(),
    _id: { $ne: req.user._id }
});

if (existingUser) {
    throw new ApiError(
        409,
        "User with this email already exists"
    );
}

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
                coverimage: 1,
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
    clearWatchHistory,
    forgotPassword,
    resetPassword
    
}