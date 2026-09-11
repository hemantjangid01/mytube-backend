import mongoose ,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema=new Schema({
    content:{
        type:String,
        required:true
    },
    
        video:{
            type:mongoose.Types.ObjectId,
            ref:"video"

        },
          owner:{
            type:mongoose.Types.ObjectId,
            ref:"user",
            required:true

        },
        parentComment:{
            type:mongoose.Types.ObjectId,
            ref:"Comment",
            default:null
        }
},{
    timestamps:true
})
commentSchema.plugin(mongooseAggregatePaginate)

export const Comment=mongoose.model("Comment",commentSchema)