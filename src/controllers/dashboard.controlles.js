import mongoose from "mongoose";
import { asynchandler } from "../utils/asynchandler.js";
import { video } from "../models/video.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { ApiError } from "../utils/apierror.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.model.js";
import { user } from "../models/user.model.js";



const getChannelStats = asynchandler(async (req, res) => {


    const {channelId}=req.params;
     if(!channelId){
                throw new ApiError(400, "invalid parameters");
        
            }
    
             const channel=await user.findById(channelId);
                            if(!channel){
                        throw new ApiError(
                            404,
                            "channel does not exist"
                        )
                    }

              const videos=await video.find({
                owner:channelId
            })
            const totalVideos=videos.length;

            const totalViews=videos.reduce(
                (sum,video)=>sum+=video.views,
                0
            );

            const totalSubscribers=await Subscription.countDocuments({
                channel:channelId
            })
            const videoids=videos.map(video=>video._id);
            const totalLikes=await Like.countDocuments({
                video:{
                    $in:videoids
                }
            })

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        totalLikes,
                        totalSubscribers,
                        totalVideos,
                        totalViews,

                    },
                    "channel stats fetched successfully"
                )
            )


                    
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
})

const getChannelVideos = asynchandler(async (req, res) => {

    const {channelId}=req.params;
     if(!channelId){
                throw new ApiError(400, "invalid parameters");
        
            }
    
             const channel=await user.findById(channelId);
                            if(!channel){
                        throw new ApiError(
                            404,
                            "channel does not exist"
                        )
                    }

            const videos=await video.find({
                owner:channelId
            })
             if(videos.length===0){
                        throw new ApiError(
                            404,
                            "No videos uploaded yet"
                        )
                    }

            res.status(200).json(
                new ApiResponse(
                    200,
                    videos,
                    "videos fetched successfully"
                )
            )
    

    // TODO: Get all the videos uploaded by the channel
})


export{
    getChannelStats,
    getChannelVideos
}