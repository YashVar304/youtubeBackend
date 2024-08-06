const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((error)=>next(error))
    }
}

export {asyncHandler}
// const asyncHandler = (fn)=>(res,req,next)=>{



    // try{
    //     await fn(req,res,next)
    // }
    // catch(error){
    //     res.status(err.code||500).json({success:false, message:error.message})
    // }
// }