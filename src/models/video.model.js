import mongoose ,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videosschema=new Schema(
    {

        videoFile:{
            type:String,
            required:true,

        },
        thumbnail:{
            type:String,
            required:true,

        },
        title:{
            type:String,
            required:true,

        },
        description:{
            type:String,
            required:true,

        },
        duration:{
            type:Number,
            required:true,

        },
         views:{
            type:Number,
            default:0            

        },
         isPublished:{
            type:Boolean,
            default:true,
            required:true,

        },
         owner:{
            type:Schema.Types.ObjectId,
            ref:"user",
            required:true,

        }










} ,{timestamps:true}
)
videosschema.plugin(mongooseAggregatePaginate)

export const video=mongoose.model("video",videosschema)