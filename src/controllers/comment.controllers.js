import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { video} from "../models/video.model.js";
import { ApiResponse } from "../utils/apiresponse.js";



const addComment =asynchandler(async(req,res)=>{
    const {videoId}=req.params;
    const {content }=req.body;
    const userId=req.user._id;
    if(!videoId||!content||!userId){
        throw new ApiError(400, "invalid parameters");

    }
        const videoo=await video.findById(videoId);
            if(!videoo){
        throw new ApiError(
            400,
            "video does not exist"
        )
    }

    const createdComment =await Comment.create({
        content,
        video:videoId,
        owner:userId

    })

    if(!createdComment){
        throw new ApiError(500,"failed to add comment")
    }


    return  res.status(201).
    json(
        new ApiResponse(
            201,
            createdComment,
            "comment added successfully"

        )
    )


})
 const removeComment=asynchandler(async(req,res)=>{
        const {commentId}=req.params;
        const userId=req.user._id;
         if(!commentId){
            throw new ApiError(
                400,
                "invalid comment id"
            )
        }

        const comment= await Comment.findById(commentId);
          if(!comment){
            throw new ApiError(
                400,
                "comment does not exist"
            )
        }

        if(comment.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  delete this comment "
            )
        }
       
        const deletedComment= await Comment.findByIdAndDelete(commentId);


         if(!deletedComment){
            throw new ApiError(
                500,
                "unable to delete comment"
            )
        }

        return res.status(200).
        json(
            new ApiResponse(
                200,
                deletedComment,
                "comment deleted successfully"
            )
        )


})
const getVideoComments = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(
            400,
            "videoid is required"
        );
    }

    const videoo = await video.findById(videoId);

    if (!videoo) {
        throw new ApiError(
            400,
            "video does not exist"
        );
    }

    // Get all comments for this video
    const allComments = await Comment.find({
        video: videoId
    })
        .populate({
            path: "owner",
            select: "fullname username avatar"
        })
        .sort({ createdAt: -1 });

    const parentComments = allComments.filter(
    (comment) => !comment.parentComment
);

const buildReplies = (parentId) => {
    return allComments
        .filter(
            (comment) =>
                comment.parentComment &&
                comment.parentComment.toString() === parentId.toString()
        )
        .map((reply) => ({
            ...reply.toObject(),
            replies: buildReplies(reply._id)
        }));
};

const comments = parentComments.map((comment) => ({
    ...comment.toObject(),
    replies: buildReplies(comment._id)
}));

    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "comments fetched successfully"
        )
    );
});

const updateComment=asynchandler(async(req,res)=>{
    const {commentId }=req.params;
    const { content }=req.body;
    const userId=req.user._id

    if(!commentId ||content?.trim()===""){
        throw new ApiError(
            400,
            "invalid comment"
        )
        

    }
       const comment= await Comment.findById(commentId);
          if(!comment){
            throw new ApiError(
                400,
                "comment does not exist"
            )
        }

        if(comment.owner.toString()!==userId.toString()){
            throw new ApiError(
                403,
                "Sorry, you are not allowed to  updatee this comment "
            )
        }


        comment.content=content;
        await comment.save();

    // const updatedComment= await Comment.findByIdAndUpdate(
    //     commentId,{
    //     content
    // },
    // {
    //     new:true
    // }
// )
//     if(!updatedComment){
//         throw new ApiError(
//             500,
//             "failed to update comment"
//         )

//     }

    return res.status(200).
    json(
        new ApiResponse(
            200,
            // updatedComment,
            comment,
            "comment updated successfully"
        )
    )



})
const replyComment=asynchandler(async(req,res)=>{
    const { commentId }=req.params;
    const { content }=req.body;
    const userId=req.user._id;
    if(!commentId){
        throw new ApiError(
            400,
            "comment id is req"
        )

    }
     if(content.trim()===""){
        throw new ApiError(
            400,
            "reply content is required"
        )
        

    }
    const parentComment=await Comment.findById(commentId);
    if(!parentComment){
         throw new ApiError(
            404,
            "comment not found to reply"
        )

        
    }
    const reply=await Comment.create({
        content,
        owner:userId,
        video:parentComment.video,
        parentComment:commentId
    })
     if(!reply){
         throw new ApiError(
            500,
            "failed to reply comment"
        )
    }

        return res.status(201).
        json(
            new ApiResponse(
                201,
                reply,
                "replied to comment successfully"
            )
        )

        
    





})

export{
    addComment,
    removeComment,
    getVideoComments,
    updateComment,
    replyComment
}
