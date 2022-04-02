import { PrismaClient } from "@prisma/client"
import express from "express"
import cors from "cors"
import "dotenv/config"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"


const app = express()
app.use(cors())
app.use(express.json())

const prisma = new PrismaClient()

function createToken(id: number) {
    //@ts-ignore
    return jwt.sign({ id: id }, process.env.MY_SECRET)
}


async function getUserFromToken(token: string) {
    //@ts-ignore
    const decodedData = jwt.verify(token, process.env.MY_SECRET)
    const user = await prisma.user.findUnique({
        //@ts-ignore
        where: { id: decodedData.id }, include: { videos: true, subscribedBy: true, subscribing: true }
    })
    return user
}


app.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, image } = req.body

    try {
        const hash = bcrypt.hashSync(password, 8)

        const user = await prisma.user.create({
            data: { firstName: firstName, lastName: lastName, email: email, password: hash, image: image }
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
            where: { email: email }, include: { videos: true, subscribedBy: true, subscribing: true }
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

app.post('/video', async (req, res) => {
    const { title, description, url, thumbnail } = req.body
    const token = req.headers.authorization || ''
    try {
        const user = await getUserFromToken(token)
        const video = await prisma.video.create({
            // @ts-ignore
            data: { title: title, description: description, url: url, thumbnail: thumbnail, userId: user.id }
        })
        res.send(video)
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})


app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({ include: { videos: true, subscribedBy: true, subscribing: true } })
    res.send(users)
})

app.get('/users/:id', async (req, res) => {

    const id = Number(req.params.id)
    try {
        const user = await prisma.user.findFirst({
            where: { id },
            include: {
                videos: true, subscribedBy: true, subscribing: true
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
    const videos = await prisma.video.findMany({ include: { user: true, comments: true, video_likes: true, video_dislikes: true } })
    res.send(videos)
})


app.get('/videos/:id', async (req, res) => {

    const id = Number(req.params.id)
    try {
        const video = await prisma.video.findFirst({
            where: { id },
            include: {
                user: true, video_likes: true, video_dislikes: true, comments: true
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
            include: { videos: true, subscribedBy: true, subscribing: true }
        })

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
            include: { comment_likes: true, comment_dislikes: true }
        })
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
                data: { commentId: commentId, userId: user.id }
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
                data: { commentId: commentId, userId: user.id }
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
                data: { videoId: videoId, userId: user.id }
            })
            res.send(watch)
        }
    }
    catch (err) {
        // @ts-ignore
        res.status(400).send({ error: err.message })
    }
})

app.listen(4000, () => {
    console.log('Server running: http://localhost:4000')
})