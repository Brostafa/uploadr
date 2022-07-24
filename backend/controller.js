import db from './db.js'
import { generate as genId } from 'shortid'
import fs from 'fs'
import logger from '../libs/logger.js'
import path from 'path'
import { info as videoInfo, convert } from '../libs/ffmpeg/wrapper.js'

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
        logger.info(`[Generate Quality] video height="${height}" qualityToMake="${quality}"`)
      }

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
    }
  } catch (e) {
    logger.error('[Generate Qualities]', e)
  }
}

genQualitiesInBg('/Users/mostafahefny/Desktop/Computer/personal/projects/video-sharing/public/uploads', 'zmSAvZy0D')

export const handleUpload = (uploadPath) => async (req, res) => {
  try {
    const { path: oldpath, originalname, size } = req.file
    const ext = path.extname(originalname)
    const newpath = oldpath + ext
    const id = genId()

    if (!ALLOWED_EXTS.includes(ext)) {
      return res.send({
        ok: false,
        error: `Bad extension. ext="${ext}"`
      })
    }

    await fsP.rename(oldpath, newpath)
    const { video: vidInfo } = await videoInfo(newpath)

    Videos[id] = {
      id,
      name: originalname.split('.')[0],
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
      ok: true
    })
  } catch (e) {
    res.send({
      ok: false,
      error: e.message
    })

    logger.error('[Upload]', e)
  }
}

export const handleWatch = () => async (req, res) => {
  const { id } = req.params

  if (id in Videos) {
    const video = Videos[id]
    const { name, qualities } = video

    return res.render('watch', {
      name,
      jsonToFrontend: JSON.stringify({
        qualities
      })
    })
  }

  res.sendStatus(404)
}
