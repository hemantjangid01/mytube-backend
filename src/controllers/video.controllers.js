import { user } from "../models/user.model.js";
import { video } from "../models/video.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  getOrSetCache,
  getCacheVersion,
  invalidateCacheVersion,
} from "../utils/cache.js";
import mongoose from "mongoose";

const HOME_CACHE_VERSION_KEY = "cache:videos:home:version";



const getAllVideos = asynchandler(async (req, res) => {
  const version = await getCacheVersion(
    HOME_CACHE_VERSION_KEY
  );

  const fetchVideos = async () => {
    return await video.find({
      isPublished: true,
    }).populate(
      "owner",
      "fullname username avatar"
    );
  };

  let allVideos;

  if (version === null) {
    // Redis unavailable: directly query MongoDB.
    allVideos = await fetchVideos();
  } else {
    const cacheKey = `cache:videos:home:v${version}`;

    allVideos = await getOrSetCache(
      cacheKey,
      fetchVideos,
      60
    );
  }

  if (allVideos.length === 0) {
    throw new ApiError(404, "No videos available");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      allVideos,
      "All videos are fetched successfully"
    )
  );
});


const publishVideo = asynchandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile?.url) {
    throw new ApiError(500, "Video upload failed");
  }

  if (!thumbnail?.url) {
    throw new ApiError(500, "Thumbnail upload failed");
  }

  const savedVideo = await video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  // Invalidate Home feed cache after successful database save.
  await invalidateCacheVersion(HOME_CACHE_VERSION_KEY);

  return res.status(201).json(
    new ApiResponse(
      201,
      savedVideo,
      "Video published successfully"
    )
  );
});

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

const updateVideo = asynchandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const targetVideo = await video.findById(videoId);

  if (!targetVideo) {
    throw new ApiError(404, "Video not found");
  }

  if (targetVideo.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not allowed to update this video"
    );
  }

  const { description, title } = req.body;

  const thumbnailPath = req.files?.thumbnail?.[0]?.path;
  let uploadedThumbnail = null;

  if (thumbnailPath) {
    uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);

    if (!uploadedThumbnail?.url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }
  }

  const updateData = {};

  if (title?.trim()) {
    updateData.title = title.trim();
  }

  if (description?.trim()) {
    updateData.description = description.trim();
  }

  if (uploadedThumbnail) {
    updateData.thumbnail = uploadedThumbnail.url;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedVideo = await video.findByIdAndUpdate(
    videoId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  // Invalidate cached Home feed.
  await invalidateCacheVersion(HOME_CACHE_VERSION_KEY);

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedVideo,
      "Video updated successfully"
    )
  );
});
const deleteVideo = asynchandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const targetVideo = await video.findById(videoId);

  if (!targetVideo) {
    throw new ApiError(404, "Video not found");
  }

  if (targetVideo.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not allowed to delete this video"
    );
  }

  await video.findByIdAndDelete(videoId);

  // Invalidate cached Home feed.
  await invalidateCacheVersion(HOME_CACHE_VERSION_KEY);

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      "Video deleted successfully"
    )
  );
});

const togglePublishedStatus = asynchandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const targetVideo = await video.findById(videoId);

  if (!targetVideo) {
    throw new ApiError(404, "Video not found");
  }

  if (targetVideo.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not allowed to change this video's status"
    );
  }

  const updatedVideo = await video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !targetVideo.isPublished,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  // Invalidate cached Home feed.
  await invalidateCacheVersion(HOME_CACHE_VERSION_KEY);

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedVideo,
      `Video ${updatedVideo.isPublished ? "published" : "unpublished"} successfully`
    )
  );
});
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