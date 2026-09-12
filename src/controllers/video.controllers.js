import { user } from "../models/user.model.js";
import { video } from "../models/video.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getAllVideos=asynchandler(async(req,res)=>{
    const allVideos= await video.find(
        {
            isPublished:true,
        }
    ) .populate("owner", "fullname username avatar");
    if(allVideos.length==0){
        throw new ApiError(
            404, " No videos available"
        )
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,allVideos," All videos are fetched successfully "
        )
    )
})

const publishVideo=asynchandler(async(req,res)=>{
    const videoData=req.body;
    const mediaFiles=req.files;
    if(!videoData){
        throw new ApiError(400,"No video credentials found");
    }
    if(!mediaFiles){
        throw new ApiError(400,"NO thumbnail and Video found");
    }

    const {description,title}=videoData;

    if(!title?.trim()||!description?.trim()){
        throw new ApiError(400,"Title and Description are required");

    }

    const thumbnailPath=mediaFiles?.thumbnail?.[0]?.path;

    if(!thumbnailPath){
        throw new ApiError(
            400,"Thumbnail is required"
        )
    }
    const uploadedThumbnail=await uploadOnCloudinary(thumbnailPath);
    if(!uploadedThumbnail){
        throw new ApiError(500,"Error while uploading thumbnail")
    }

    const videoFilePath=mediaFiles?.videoFile?.[0]?.path;
    if(!videoFilePath){
        throw new ApiError(400,"Invalid video File path");
    }


    const uploadedVideo=await uploadOnCloudinary(videoFilePath);
     if(!uploadedVideo){
        throw new ApiError(500,"Error Occured While Uploading");

     }

     const savedVideo=await video.create({

        videoFile:uploadedVideo.url,
        thumbnail:uploadedThumbnail.url,
        title,
        description,
        duration:uploadedVideo.duration,
        owner:req.user._id
     })

     


     


     return res.status(201)
     .json(
        new ApiResponse(
            201,
            savedVideo,
            "video uploaded successfully"
        )
     )
    
})

const getVideoById=asynchandler(async(req,res)=>{
    const { videoId }=req.params;
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(
            400,"Videoid is required"
        )
    }
        const fetchedVideo=await video.findByIdAndUpdate( videoId,
            { $inc: { views: 1

             } 
            },
             { new: true

              }
        ).populate("owner","username fullname avatar");

        if(!fetchedVideo||!fetchedVideo.isPublished){
            throw new ApiError(404,"video not found ")
        }
          



    
    return res.status(200)
    .json(
       new ApiResponse(200,fetchedVideo,"video fetched successfully")
    )
    
})

const updateVideo=asynchandler(async(req,res)=>{

    const{ videoId }=req.params;

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(
            400,"Videoid is required"
        )}
        const targetVideo = await video.findById(videoId);

        if (!targetVideo) {
         throw new ApiError(404, "video not found");
}

        if (targetVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
        403,
        "You are not allowed to update this video"
    );
}

        const { description,title}=req.body;

        const thumbnailPath=req.files?.thumbnail?.[0]?.path;
        let uploadedThumbnail=null;

        if(thumbnailPath){
            uploadedThumbnail=await uploadOnCloudinary(thumbnailPath);
            
        }
        const updateData={};
        if(title?.trim()){
            updateData.title=title;
        }
        if(description?.trim()){
            updateData.description=description;
        }

        if(uploadedThumbnail){
            updateData.thumbnail=uploadedThumbnail?.url

        }

        

        const updatedVideo= await video.findByIdAndUpdate(
            videoId,
            updateData,
            {
                new:true
            }
        );

        if(!updatedVideo){
            throw new ApiError(404,"video not found");
        }

        return res.status(200)
        .json(
            new ApiResponse(200,updatedVideo,"updation successful")
        )
        





})
const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(
            400,
            "Invalid video id"
        );
    }

    const targetVideo = await video.findById(videoId);

    if (!targetVideo) {
        throw new ApiError(
            404,
            "Video not found"
        );
    }

    if (
        targetVideo.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not allowed to delete this video"
        );
    }

    await video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    );
});

const togglePublishedStatus=asynchandler(async(req,res)=>{
     const{ videoId }=req.params;

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(
            400,"Videoid is required"
        )}

        const targetVideo=await video.findById(videoId);

        if(!targetVideo){
            throw new ApiError(404,"video not found");

        }
        if (targetVideo.owner.toString() !== req.user._id.toString()) {
              throw new ApiError(
                403,
                "You are not allowed to change this video's publish status"
                 );
}
        

        
            const updatedVideo=await video.findByIdAndUpdate(
                videoId,
                {
                    isPublished:!targetVideo.isPublished
                },{
                    new:true
                }

            )
        

        if(!updatedVideo){
            throw new ApiError(500,"Error while updating toggle value")
        }

        return res.status(200)
        .json(new ApiResponse(
            200,
            updatedVideo,
            "publish status  updated successfully"
        ))
        


    
    
    

})
const searchVideos = asynchandler(async (req, res) => {
    const { query } = req.query;
    if (!query || query.trim() === "") {
        throw new ApiError(
            400,
            "search query is required"
        );
    }

    const videos = await video.find({
        isPublished: true,
        $or: [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ]
    }).sort({
        createdAt: -1
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "videos searched successfully"
        )
    );
});
const getMyVideos = asynchandler(async (req, res) => {
    const userId = req.user._id;

    const videos = await video
        .find({ owner: userId })
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "user videos fetched successfully"
            )
        );
});
const getChannelVideos = asynchandler(async (req, res) => {
    const { username } = req.params;

    const channel = await user.findOne({
        username: username.toLowerCase(),
    });

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const videos = await video
        .find({
            owner: channel._id,
            isPublished: true,
        })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "channel videos fetched successfully"
        )
    );
});

  export{
        publishVideo,
        getVideoById,
        updateVideo,
        deleteVideo,
        togglePublishedStatus,
        getAllVideos,
        searchVideos,
        getMyVideos,
        getChannelVideos
     }