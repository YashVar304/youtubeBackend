import {asyncHandler} from '../utils/asyncHandlers.js'
import { ApiError } from '../utils/apiError.js'
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessTokenAndRefreshToken = async(userId)=>{
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({validateBeforeSave:false})
    return {accessToken,refreshToken}
}

const registerUser = asyncHandler(async (req,res)=>{
    const {username, email, password,fullName} = await req.body

    if(!username || !email || !password || !fullName){
        throw new ApiError(400,"Please provide all fields")
    }
    const existedUser = await User.findOne({$or:[{username},{email}]})
    if(existedUser){
        throw new ApiError(400,"User already exists")
    }
    console.log(req.files)
    const avatarLocalPath=  req.files?.avatar[0]?.path    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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

const loginUser = asyncHandler(async ( req,res)=>{
    const {email,username ,password} = req.body

    if(!email && !username){
        throw new ApiError(400,"Username or Password is required")
    }
    const user= await User.findOne({
        $or : [{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid credentials")
    }
    const {accessToken,refreshToken}= await generateAccessTokenAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new ApiResponse(200,"User logged in successfully",{
        user:loggedInUser,
        accessToken,
        refreshToken,
    }))

})

const logoutUser = asyncHandler(async (req,res)=>{
    const user = User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },
    {new:true}
    
)
const options = {
    httpOnly : true,
    secure : true
}
 return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,"User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken 
    if(!incomingRefreshToken){
        throw new ApiError(400,"Refresh token is required")
    }
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    if(!decodedToken){
        throw new ApiError(401,"Invalid refresh token")
    }
    const user = await User.findById(decodedToken._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    if(incomingRefreshToken !== user.refreshToken){
        throw new ApiError(401,"Invalid refresh token")
    }
    const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(new ApiResponse(200,"User logged in successfully",{
        user:loggedInUser,
        accessToken,
        refreshToken:newRefreshToken,
    }))

})

export {registerUser,loginUser,logoutUser,refreshAccessToken} 