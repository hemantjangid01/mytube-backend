import mongoose ,{Schema} from "mongoose";

const likeSchema=new Schema({
    
            video:{
                type:mongoose.Types.ObjectId,
                ref:"Video"
    
            },
            
                    comment:{
                        type:mongoose.Types.ObjectId,
                        ref:"Comment"
            
                    },
                    
                            tweet:{
                                type:mongoose.Types.ObjectId,
                                ref:"Tweet"
                    
                            },
                            
                                    likedBy:{
                                        type:mongoose.Types.ObjectId,
                                        ref:"user"
                            
                                    },

},{
    timestamps:true
})

export const Like=mongoose.model("Like",likeSchema)