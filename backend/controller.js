import { generate as genId } from 'shortid'
import fs from 'fs'
import path from 'path'
import db from './db.js'
import logger from '../libs/logger.js'
import { info as videoInfo, convert, getThumbnail } from '../libs/ffmpeg/wrapper.js'

const fsP = fs.promises
const { videos: Videos } = db.data
const ALLOWED_EXTS = [
  '.mp4'
]
const QUALITIES = [
  1080,
  720,
  576
]

const genQualitiesInBg = async (uploadPath, id) => {
  try {
    logger.info(`[Generate Qualities] starting for id="${id}"`)

    const { qualities: { original } } = Videos[id]
    const { filename, height } = original
    const inputPath = path.join(uploadPath, filename)
    const qualitiesToMake = QUALITIES.slice(0)

    while (qualitiesToMake.length) {
      const quality = qualitiesToMake.pop()
      const outputFilename = `${filename.split('.')[0]}-${quality }.mp4`
      const outputPath = path.join(uploadPath, outputFilename)

      if (quality < height) {
        logger.info(`[Generate Quality] Starting id="${id}" video height="${height}" qualityToMake="${quality}"`)
        const now = Date.now()

        await convert({
          inputPath,
          outputPath,
          fps: 30,
          aspect: '16:9',
          height: quality,
        })

        const { video: vidInfo } = await videoInfo(outputPath)
        const { size } = await fsP.stat(outputPath)
        // q1080, q720, q576
        const qualityKey = 'q' + quality
        Videos[id].qualities[qualityKey] = {
          filename: path.basename(outputPath),
          size,
          ...vidInfo
        }

        db.write()
        logger.success(`[Generate Quality] Done id="${id}" outputFile="${path.basename(outputPath)}" execTime="${(Date.now() - now) / 1000} sec"`)
      }
    }
  } catch (e) {
    logger.error('[Generate Qualities]', e)
  }
}

const getServerLink = ({ publicPath, filepath }) => {
  const relativeFilepath = filepath.replace(publicPath, '')
  const serverLink = process.env.SERVER_URL + relativeFilepath

  return serverLink
}

export const handleUpload = (publicPath, uploadPath) => async (req, res) => {
  try {
    const { path: oldpath, originalname, size } = req.file
    const ext = path.extname(originalname)
    const newpath = oldpath + ext
    const id = genId()

    if (!ALLOWED_EXTS.includes(ext)) {
      return res.send({
        error: `Bad extension. ext="${ext}"`
      })
    }

    await fsP.rename(oldpath, newpath)

    const { video: vidInfo } = await videoInfo(newpath)
    const { width, height } = vidInfo
    const { outputPath: thumbnailPath } = await getThumbnail({
      inputPath: newpath,
      desiredOutputPath: newpath.replace(ext, '.jpg')
    })

    const videoUrl = process.env.SERVER_URL + `/w/${id}`
    const thumbnailUrl = getServerLink({ publicPath, filepath: thumbnailPath })

    Videos[id] = {
      id,
      name: originalname.split('.')[0],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      videoUrl,
      thumbnailUrl,
      width,
      height,
      qualities: {
        'original': {
          filename: path.basename(newpath),
          size,
          ...vidInfo
        }
      }
    }

    db.write()

    genQualitiesInBg(uploadPath, id)

    res.send({
      shareUrl: process.env.SERVER_URL + `/w/${id}`
    })
  } catch (e) {
    res.send({
      error: e.message
    })

    logger.error('[Upload]', e)
  }
}

export const handleWatch = () => async (req, res) => {
  const { id } = req.params

  if (id in Videos) {
    const video = Videos[id]
    const {
      name,
      qualities,
      width,
      height,
      updatedAt,
      thumbnailUrl,
      videoUrl,
    } = video

    return res.render('watch', {
      name,
      width,
      height,
      updatedAt,
      thumbnailUrl,
      videoUrl,
      jsonToFrontend: JSON.stringify({
        qualities
      })
    })
  }

  res.sendStatus(404)
}
