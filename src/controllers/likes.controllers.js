import mongoose from "mongoose";
import { asynchandler } from "../utils/asynchandler.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { ApiError } from "../utils/apierror.js";
import { video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";


const toggleVideoLike = asynchandler(async (req, res) => {
    const {videoId} = req.params
    const userId=req.user._id
   

     if(!videoId||!userId){
        throw new ApiError(400, "invalid parameters");

    }
        const videoo=await video.findById(videoId);
                if(!videoo){
            throw new ApiError(
                400,
                "video does not exist"
            )
        }
        const existingLike=await Like.findOne({
            video:videoId,
            likedBy:userId
        })

        if(existingLike){
            await Like.findByIdAndDelete(existingLike._id)

            return res.status(201).
            json(
                new ApiResponse(201,null,"video unliked successfully")
            )
        }






    const videoliked=await Like.create({
        video:videoId,
        likedBy:userId


    })

    if(!videoliked){
        throw new ApiError(500, "error while liking video");

    }

    return res.status(201)
    .json(
        new ApiResponse(
            201,
            videoliked,
            "video liked successfully"
        )
    )


})
const getVideoLikeInfo = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const likeCount = await Like.countDocuments({
    video: videoId,
  });

  const userLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likeCount,
        isLiked: !!userLike,
      },
      "like information fetched successfully"
    )
  );
});

const toggleCommentLike = asynchandler(async (req, res) => {
    const {commentId} = req.params
   const userId=req.user._id


     if(!commentId||!userId){
        throw new ApiError(400, "invalid parameters");

    }
        const comment=await Comment.findById(commentId);
                if(!comment){
            throw new ApiError(
                400,
                "comment does not exist"
            )
        }
        const existingLike=await Like.findOne({
            comment:commentId,
            likedBy:userId
        })

        if(existingLike){
            await Like.findByIdAndDelete(existingLike._id)

            return res.status(201).
            json(
                new ApiResponse(201,null,"comment unliked successfully")
            )
        }






    const commentliked=await Like.create({
        comment:commentId,
        likedBy:userId


    })

    if(!commentliked){
        throw new ApiError(500, "error while liking comment");

    }

    return res.status(201)
    .json(
        new ApiResponse(
            201,
            commentliked,
            "comment liked successfully"
        )
    )


})

const toggleTweetLike = asynchandler(async (req, res) => {
    const {tweetId} = req.params;
     const userId=req.user._id


     if(!tweetId||!userId){
        throw new ApiError(400, "invalid parameters");

    }
        const tweet=await Tweet.findById(tweetId);
                if(!tweet){
            throw new ApiError(
                400,
                "tweet does not exist"
            )
        }
        const existingLike=await Tweet.findOne({
            twee:tweetId,
            likedBy:userId
        })

        if(existingLike){
            await Like.findByIdAndDelete(existingLike._id)

            return res.status(201).
            json(
                new ApiResponse(201,null,"tweet unliked successfully")
            )
        }






    const tweetliked=await Like.create({
        tweet:tweetId,
        likedBy:userId


    })

    if(!tweetliked){
        throw new ApiError(500, "error while liking tweet");

    }

    return res.status(201)
    .json(
        new ApiResponse(
            201,
            tweetliked,
            "tweet liked successfully"
        )
    )
    
}
)

const getLikedVideos = asynchandler(async (req, res) => {
    const userId=req.user._id
     if(!userId){
        throw new ApiError(400, "invalid parameters");

    }

    const likedVideos = await Like.find({
    likedBy: userId,
    video: { $exists: true }
});
    if(likedVideos.length===0){
        throw new ApiError(
            404,
            "no videos found"
                )
    }


    return res.status(200).json(

        new ApiResponse(200,likedVideos,"liked videos fetched successfully")
    )






})


export{
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getVideoLikeInfo    

}








