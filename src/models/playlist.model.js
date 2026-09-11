import mongoose ,{Schema, SchemaTypes} from "mongoose";

const playlistSchema=new Schema({

    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    videos:[{
        type:Schema.Types.ObjectId,
        ref:"video"
        
    }],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"user"
    },

},{timestamps:true})


export const Playlist=mongoose.model("Playlist",playlistSchema)