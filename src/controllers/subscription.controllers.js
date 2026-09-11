import mongoose from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { asynchandler } from "../utils/asynchandler.js";
import { user } from "../models/user.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";


const toggleSubscription = asynchandler(async (req, res) => {
    const {channelId} = req.params
        const userId=req.user._id;
         if(!channelId||!userId){
            throw new ApiError(400, "invalid parameters");
    
        }

         const Channel=await user.findById(channelId);
                        if(!Channel){
                    throw new ApiError(
                        404,
                        "channel does not exist"
                    )
                }

                if(channelId.toString()===userId.toString()){
                throw new ApiError(
                    400,
                    "Sorry, you can not subscribe yourself "
                )

            }


            const existingSubscription=await Subscription.findOne({
                subscriber:userId,
                channel:channelId
            })

            if(existingSubscription){
                await existingSubscription.deleteOne();
                 return res.status(200).
            json(
                new ApiResponse(200,null,"channel unsubscribed successfully")
            )

            }
            const subscription=await Subscription.create({
                subscriber:userId,
                channel:channelId

            });
                return res.status(201).
                 json(
                new ApiResponse(201,subscription,"channel subscribed successfully")
            )
})


const getUserChannelSubscribers = asynchandler(async (req, res) => {
    const {channelId} = req.params
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

                const subscribers=await Subscription.find({
                    channel:channelId
                })



                 return res.status(200).
                 json(
                new ApiResponse(200,subscribers,"subscribers fetched successfully")
            )

                












})


const getSubscribedChannels = asynchandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!subscriberId){
            throw new ApiError(400, "invalid parameters");
    
        }

         const subscriber=await user.findById(subscriberId);
                        if(!subscriber){
                    throw new ApiError(
                        404,
                        "subscriber does not exist"
                    )
                }

                const channels=await Subscription.find({
                    subscriber:subscriberId
                }).populate("channel", "-password -refreshToken")

                 return res.status(200).
                 json(
                new ApiResponse(200,channels,"channels fetched successfully")
            )




})


export{
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers
}


