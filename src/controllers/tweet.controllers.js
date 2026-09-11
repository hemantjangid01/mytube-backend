import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";


const getAllTweets = asynchandler(async (req, res) => {
    const tweets = await Tweet.find({})
        .populate("owner", "fullname username avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(
            200,
            tweets,
            "all tweets fetched successfully"
        )
    );
});

const createTweet = asynchandler(async (req, res) => {
    const {content} = req.body;
        const userId=req.user._id;
         if(!content||!userId){
            throw new ApiError(400, "invalid parameters");
    
        }

        const createdTweet=await Tweet.create({
            content,
            owner:userId
        })

        if(!createdTweet){
              throw new ApiError(500, "failed to tweet");

        }

        return res.status(201).json(
            new ApiResponse(
        201,
        createdTweet,
        "tweeted successfully"
            )

    )





    
})

const getUserTweets = asynchandler(async (req, res) => {
     
        const userId=req.user._id;
         if(!userId){
            throw new ApiError(400, "invalid parameters");
    
        }



        const userTweets= await Tweet.find({owner:userId})
        .populate("owner", "fullname username avatar")
        .sort({
            createdAt: -1
        })

         if(userTweets.length===0){
            throw new ApiError(404, "no tweets yet");
    
        }

        
    

          return res.status(200).json(
            new ApiResponse(
        200,
        userTweets,
        "tweets fetched successfully"
            )

    )



         









})

const updateTweet = asynchandler(async (req, res) => {
     const {content} = req.body;
        const userId=req.user._id;
        const {tweetid}=req.params;

        console.log("CONTENT:", content);
          console.log("USER ID:", userId);
         console.log("TWEET ID:", tweetid);
         if(!content||!userId||!tweetid){
            throw new ApiError(400, "invalid parameters");
    
        }

        const tweet=await Tweet.findById(tweetid);
          if(!tweet){
            throw new ApiError(
                400,
                "tweet does not exist"
            )
        }



     if(tweet.owner.toString()!==userId.toString()){
                throw new ApiError(
                    403,
                    "Sorry, you are not allowed to  modify this tweet "
                )
            }

            tweet.content=content;
            await tweet.save();


                 return res.status(201).json(
                    new ApiResponse(
                    201,
                     tweet,
                         "tweet updated successfully"
                    )

    )






})

const deleteTweet = asynchandler(async (req, res) => {
        const userId=req.user._id;
        const {tweetid}=req.params;
         if(!userId||!tweetid){
            throw new ApiError(400, "invalid parameters");
    
        }

        const tweet=await Tweet.findById(tweetid);
          if(!tweet){
            throw new ApiError(
                400,
                "tweet does not exist"
            )
        }



     if(tweet.owner.toString()!==userId.toString()){
                throw new ApiError(
                    403,
                    "Sorry, you are not allowed to  delete this tweet "
                )
            }

            tweet.deleteOne();
            


                 return res.status(200).json(
                    new ApiResponse(
                    200,
                     tweet,
                         "tweet deleted successfully"
                    )

    )





})

export{
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getAllTweets
}