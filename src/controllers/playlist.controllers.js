import { asynchandler } from "../utils/asynchandler.js"
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { video } from "../models/video.model.js";

const createPlaylist = asynchandler(async (req, res) => {
    const {name, description} = req.body;
    const userId=req.user._id;
     if(!description.trim()||!name.trim()||!userId.trim()){
        throw new ApiError(400, "invalid parameters");

    }
    const createdPlaylist=await Playlist.create({
        name,
        description,
        videos:[],
        owner:userId

        

    })

    if(!createdPlaylist){
        throw new ApiError(500,"failed to create playlist")
    }
    return res.status(201).json(
        new ApiResponse(
        201,
        createdPlaylist,
        "playlist created successfully"
        )

    )



})

const getUserPlaylists = asynchandler(async (req, res) => {
    const userId = req.user._id
     if(!userId){
        throw new ApiError(400, "invalid parameters");

    }
    const playlists=await Playlist.find({owner:userId})

    if(playlists.length===0){
         throw new ApiError(404, "no playlists found");

    }
    return res.status(200).json(
        new ApiResponse(
            200,
            playlists,
            "playlists fetched successfully"
        )
    )


})

const getPlaylistById = asynchandler(async (req, res) => {
    const {playlistId} = req.params
     if(!playlistId){
        throw new ApiError(400, "playlistid is required");

    }
    const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user._id
}).populate("videos", "title description thumbnail owner");
     
    if(!playlist){
        throw new ApiError(404, "no playlist exist");

    }
     return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "playlist fetched successfully"
        )
    )
    
})

const addVideoToPlaylist = asynchandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId=req.user._id
     if(!playlistId||!videoId){
        throw new ApiError(400, "invalid parameters");

    }const playlist=await Playlist.findById(playlistId);
     if(!playlist){
        throw new ApiError(404, "playlist not found");

    }
    if(playlist.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  modify this playlist "
            )
        }
    const videoo=await video.findById(videoId);
     
    if(!videoo){
        throw new ApiError(404, "video not found");

    }


        if(playlist.videos.includes(videoId)){
            throw new ApiError(409, "video already in playlist");
        }

    // const updatedPlaylist=await Playlist.findByIdAndUpdate(
    //     playlistId,
    //     {
    //          $push: 
    //             {
    //                 videos: videoId
    //             },
            

    //     },{
    //         new:true

    //     }
    // )

    playlist.videos.push(videoId);
    await playlist.save();
    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "video added successfully"
        )
    )








})

const removeVideoFromPlaylist = asynchandler(async (req, res) => {
    const {playlistId, videoId} = req.params
      const userId=req.user._id
     if(!playlistId||!videoId){
        throw new ApiError(400, "invalid parameters");

    }
    const playlist=await Playlist.findById(playlistId);
     if(!playlist){
        throw new ApiError(404, "playlist not found");

    }
    if(playlist.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  modify this playlist "
            )
        }
    const videoo=await video.findById(videoId);
     
    if(!videoo){
        throw new ApiError(404, "video not found");

    }

        if(!playlist.videos.some(Id=>Id.toString()===videoId)){
            throw new ApiError(409, "video not in playlist");
        }

        playlist.videos.pull(videoId);
        await playlist.save();


        return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "video removed successfully"
        )
    )

})

const deletePlaylist = asynchandler(async (req, res) => {
    const {playlistId} = req.params
    const userId=req.user._id
     if(!playlistId){
        throw new ApiError(400, "invalid parameters");

    }


      const playlist=await Playlist.findById(playlistId);
     if(!playlist){
        throw new ApiError(404, "playlist not found");

    }
     if(playlist.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  modify this playlist "
            )
        }
    await playlist.deleteOne();
     return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "playlist deleted successfully"
        )
    )
    
})

const updatePlaylist = asynchandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    const userId=req.user._id
     if(!playlistId){
        throw new ApiError(400, "invalid parameters");

    }
    


      const playlist=await Playlist.findById(playlistId);
     if(!playlist){
        throw new ApiError(404, "playlist not found");

    }
     if(playlist.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  modify this playlist "
            )
        }

        playlist.name=name.trim();
        playlist.description=description.trim();
        await playlist.save();

         return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "playlist updated successfully"
        )
    )




})




export{
    createPlaylist,
    getPlaylistById,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}