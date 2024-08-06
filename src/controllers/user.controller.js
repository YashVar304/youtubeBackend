import {asyncHandler} from '../utils/asyncHandlers.js'
import { ApiError } from '../utils/apiError.js'
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'

const registerUser = asyncHandler(async (req,res)=>{
    const {username, email, password,fullName} = req.body

    if(!username || !email || !password || !fullName){
        throw new ApiError(400,"Please provide all fields")
    }
    const existedUser = await User.findOne({$or:[{username},{email}]})
    if(existedUser){
        throw new ApiError(400,"User already exists")
    }
    console.log(req.files)
    const avatarLocalPath= await req.files?.avatar[0]?.path    
    const coverImageLocalPath = await req.files?.coverImage[0]?.path
    if(!avatarLocalPath ){
        throw new ApiError(400,"Please provide avatar image")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) 
    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar image")
    }
    const user = await User.create({
        username:username.toLowerCase(),
        email,
        password,
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url|| ""
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"Failed to create user")
    }
    return res.status(201).json(new ApiResponse(201,"User created successfully",createdUser))
})
export {registerUser} 