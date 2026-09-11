import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import "dotenv/config.js"


    // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });
//     CLOUDINARY_CLOUD_NAME=jqbztub0
// CLOUDINARY_API_KEY=281221699696663
// CLOUDINARY_API_SECRET=pjplmqAv3eHwIsmylDTNsyqf8Vo
    
     const uploadOnCloudinary =async(localfilepath) =>{ 
        try {
        if(!localfilepath){
            return null;
        }



        const response=await cloudinary.uploader.upload(
           localfilepath, {
            resource_type:"auto",
           }
           
       );
      if (fs.existsSync(localfilepath)) {
    fs.unlinkSync(localfilepath);
}
       return response;
        }
        catch(error){
          if (fs.existsSync(localfilepath)) {
    fs.unlinkSync(localfilepath);
}
           console.log("errror",error);
           return null;
       };
    };
    



export { uploadOnCloudinary }