import mongoose ,{Schema, SchemaTypes} from "mongoose";


const tweetSchema=new Schema({
     content:{
        type:String,
        required:true
    },
      owner:{
                type:mongoose.Types.ObjectId,
                ref:"user"
    
            }
    
},{timestamps:true})

export const Tweet=mongoose.model("Tweet",tweetSchema)