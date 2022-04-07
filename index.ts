import { PrismaClient } from "@prisma/client"
import express from "express"
import cors from "cors"
import "dotenv/config"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import multer from "multer"

const app = express()
app.use(cors())
app.use(express.json())
app.use('/public', express.static('public'))
const prisma = new PrismaClient()

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})
const upload = multer({ storage })

function createToken(id: number) {
    //@ts-ignore
    return jwt.sign({ id: id }, process.env.MY_SECRET)
}


async function getUserFromToken(token: string) {
    //@ts-ignore
    const decodedData = jwt.verify(token, process.env.MY_SECRET)
    const user = await prisma.user.findUnique({
        //@ts-ignore
        where: { id: decodedData.id }, include: { videos: true, subscribedBy: true, subscribing: { include: { videos: true } }, Video_Views: true, watch_later: { include: { video: true, user: true } }, video_likes: true, notifications: { include: { user: true } } }
    })
    return user
}


app.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, image } = req.body

    try {
        const hash = bcrypt.hashSync(password, 8)

        const user = await prisma.user.create({
            data: { firstName: firstName, lastName: lastName, email: email, password: hash, image: image },
            include: { videos: true, notifications: { include: { user: true } }, subscribedBy: true, subscribing: { include: { videos: true } }, video_likes: true, Video_Views: true, watch_later: { include: { video: true, user: true } } }
        })
        res.send({ user, token: createToken(user.id) })
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/login', async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: { email: email }, include: { videos: true, notifications: { include: { user: true } }, subscribedBy: true, subscribing: { include: { videos: true } }, video_likes: true, Video_Views: true, watch_later: { include: { video: true, user: true } } }
        })
        //@ts-ignore
        const passwordMatch = bcrypt.compareSync(password, user.password)

        if (user && passwordMatch) {
            res.send({ user, token: createToken(user.id) })
        }
        else {
            throw Error('Something wrong!')
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: 'User or password invalid' })
    }
})


app.get('/validate', async (req, res) => {
    const token = req.headers.authorization || ''

    try {
        const user = await getUserFromToken(token)

        res.send(user)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: 'Invalid Token' })
    }
})

app.post('/video', upload.single("url"), async (req, res) => {
    const token = req.headers.authorization || ''
    try {
        const path = req.file?.path
        const user = await getUserFromToken(token)
        const { title, description, thumbnail } = req.body
        const video = await prisma.video.create({
            // @ts-ignore
            data: { title: title, description: description, url: path, thumbnail: thumbnail, userId: user.id }
        })
        res.status(200).send(video)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: 'Invalid Token' })
    }
})


app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({ include: { videos: true, subscribedBy: true, subscribing: true, video_likes: true, watch_later: { include: { video: true, user: true } } } })
    res.send(users)
})

app.get('/users/:id', async (req, res) => {

    const id = Number(req.params.id)
    try {
        const user = await prisma.user.findFirst({
            where: { id },
            include: {
                videos: true, subscribedBy: true, subscribing: true, video_likes: true, watch_later: { include: { video: true, user: true } }
            }
        })
        if (user) {
            res.send(user)
        }

        else {
            res.status(404).send({ error: 'User not found' })
        }
    } catch (error) {
        //@ts-ignore
        res.status(400).send({ error: error.message })
    }
})

app.get('/videos', async (req, res) => {
    const videos = await prisma.video.findMany({ include: { user: true, videoTags: { include: { hashTag: true } }, comments: { include: { user: true, comment_dislikes: true, comment_likes: true } }, Video_Views: true, video_likes: true, video_dislikes: true } })
    res.send(videos)
})


app.get('/videos/:id', async (req, res) => {

    const id = Number(req.params.id)
    try {
        const video = await prisma.video.findFirst({
            where: { id },
            include: {
                user: true, video_likes: true, video_dislikes: true, comments: { include: { user: true, comment_dislikes: true, comment_likes: true } }, Video_Views: true, videoTags: { include: { hashTag: true } }
            }
        })
        if (video) {
            res.send(video)
        }
        else {
            res.status(404).send({ error: 'Video not found' })
        }
    } catch (error) {
        //@ts-ignore
        res.status(400).send({ error: error.message })
    }
})

app.patch('/subscribe', async (req, res) => {

    const token = req.headers.authorization || ''
    const { subscribeId } = req.body
    try {
        const user = await getUserFromToken(token)
        const updatedUser = await prisma.user.update({
            // @ts-ignore
            where: { id: user.id }
            , data: {
                subscribing: {
                    connect: {
                        id: subscribeId
                    }
                }
            },
            include: { videos: true, subscribedBy: true, subscribing: true, notifications: true }
        })
        if (user) {

            await prisma.notification.create({
                data: {
                    message: `${user.firstName} subscribed on your channel`, userId: subscribeId
                }
            })
        }

        res.send(updatedUser)
    } catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }

})

app.post('/video_likes', async (req, res) => {
    const { videoId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const like = await prisma.video_likes.create({
                // @ts-ignore
                data: { videoId: videoId, userId: user.id }
            })
            const video = await prisma.video.findFirst({
                where: { id: videoId }
            })
            if (video && user) {

                await prisma.notification.create({
                    data: {
                        message: `${user.firstName} liked your video`, userId: video.userId
                    }
                })
            }
            res.send(like)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/video_dislikes', async (req, res) => {
    const { videoId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const dislike = await prisma.video_dislikes.create({
                // @ts-ignore
                data: { videoId: videoId, userId: user.id }
            })
            const video = await prisma.video.findFirst({
                where: { id: videoId }
            })
            if (video && user) {

                await prisma.notification.create({
                    data: {
                        message: `${user.firstName} disliked your video`, userId: video.userId
                    }
                })
            }
            res.send(dislike)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/comments', async (req, res) => {
    const token = req.headers.authorization || ''
    const { commentText, videoId } = req.body
    try {
        const user = await getUserFromToken(token)
        const comment = await prisma.comment.create({
            // @ts-ignore
            data: { commentText: commentText, userId: user.id, videoId: videoId },
            include: { comment_likes: true, comment_dislikes: true, user: true }
        })
        const video = await prisma.video.findFirst({
            where: { id: videoId }
        })
        if (video && user) {

            await prisma.notification.create({
                data: {
                    message: `${user.firstName} commented on your video`, userId: video.userId
                }
            })
        }
        res.send(comment)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.post('/comment_likes', async (req, res) => {
    const { commentId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const like = await prisma.comment_likes.create({
                // @ts-ignore
                data: { commentId: commentId, userId: user.id }, include:
                    { user: true, comment: true }
            })
            res.send(like)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.post('/comment_dislikes', async (req, res) => {
    const { commentId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const dislike = await prisma.comment_dislikes.create({
                // @ts-ignore
                data: { commentId: commentId, userId: user.id }, include:
                    { user: true, comment: true }
            })
            res.send(dislike)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/video_likes', async (req, res) => {
    const { videoId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const like = await prisma.video_likes.create({
                // @ts-ignore
                data: { videoId: videoId, userId: user.id }
            })
            res.send(like)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/watch_later', async (req, res) => {
    const { videoId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (!user) {
            res.status(404).send({ error: 'You need to login before.' })
        }
        else {
            const watch = await prisma.watch_later.create({
                // @ts-ignore
                data: { videoId: videoId, userId: user.id },
                include: { video: { include: { user: true } } }
            })
            res.send(watch)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.get('/watch_later', async (req, res) => {
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (user) {
            const watch = await prisma.watch_later.findMany({
                // @ts-ignore
                where: { userId: user.id },
                include: { video: { include: { user: true } } }
            })
            res.send(watch)
        }
        else {
            res.status(404).send({ error: 'You need to login before.' })
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.get('/usersToSubscribe', async (req, res) => {
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (user) {
            const usersToSubscribe = await prisma.user.findMany({
                // @ts-ignore
                where: { NOT: { id: user.id } }
            })

            res.send(usersToSubscribe)
        }
        else {
            res.status(404).send({ error: 'You need to login before.' })
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.get('/likedVideos', async (req, res) => {
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        if (user) {
            const likedVideos = await prisma.video_likes.findMany({
                // @ts-ignore
                where: { userId: user.id },
                include: { video: { include: { user: true } } }
            })

            res.send(likedVideos)
        }
        else {
            res.status(404).send({ error: 'You need to login before.' })
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.post('/search', async (req, res) => {
    const { searchedText } = req.body
    try {
        const video = await prisma.video.findMany({
            where: {
                title: {
                    contains: searchedText
                }
            }, include: { user: true }

        })
        res.send(video)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.post('/video_views', async (req, res) => {
    const { videoId } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)

        const view = await prisma.video_Views.create({
            // @ts-ignore
            data: { videoId: videoId, userId: user.id }
        })
        res.send(view)

    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.get('/viewHistory', async (req, res) => {
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        const view = await prisma.video_Views.findMany({
            // @ts-ignore
            where: { userId: user.id },
            distinct: ["videoId"],

            include: { video: { include: { user: true } } }
        })

        res.send(view)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})



app.get('/trending', async (req, res) => {
    try {

        const trending = await prisma.video.findMany({
            orderBy: {
                Video_Views: { _count: 'desc' }
            },
            include: { user: true, Video_Views: true }
        })

        res.send(trending)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.post('/tags', async (req, res) => {
    const { name, videoId } = req.body
    try {

        const tags = await prisma.videoTags.create({
            data: { video: { connect: { id: videoId } }, hashTag: { create: { name: name } } }
        })
        res.send(tags)
    }
    catch (error) {
        //@ts-ignore
        res.status(400).send({ error: error.message })
    }
})

app.delete('/watchlater/:id', async (req, res) => {
    const token = req.headers.authorization || ''
    const id = Number(req.params.id)
    try {
        const user = await getUserFromToken(token)
        const watch = await prisma.watch_later.findUnique({ where: { id: id } })

        if (user?.id === watch?.userId) {
            const watchlater = await prisma.watch_later.delete({ where: { id: id } })
            res.send(watchlater)
        }
        else {
            res.status(400).send({ error: 'Not authorized to delete' })
        }
    }
    catch (error) {
        //@ts-ignore
        res.status(400).send({ error: error.message })
    }
})



app.listen(4000, () => {
    console.log('Server running: http://localhost:4000')
})