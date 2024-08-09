import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import jwt from 'jsonwebtoken'
import {User} from "../models/user.models.js";

export const verifyJwt = asyncHandler(async(req,res,next)=>{
   try {
    const token= req.cookies?.accessToken || req.header("authorization")?.replace("Bearer ","")
    if(!token){
     throw new ApiError(401,"Unauthorised access token")
    }
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
     if(!user){
      throw new ApiError(401,"Unauthorised access user")
     }
     req.user = user
     next()
    
   } catch (error) {
     throw new ApiError(401,"Unauthorised access error")
   }
})