import path from 'path'
// Only require those on the child, forked process in case library had memory leaks
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const convert = ({
  inputPath, outputPath, outputExt, fps, aspect, height
}) => new Promise((resolve, reject) => {
  const { name } = path.parse(inputPath)
  const input = path.join(path.dirname(inputPath), name + outputExt)
  outputPath = outputPath || path.resolve(input)
  const command = ffmpeg(inputPath)
    .output(outputPath)
    .on('error', reject)
    .on('end', () => resolve(outputPath))

  if (fps) {
    command.outputFPS(fps)
  }

  if (height) {
    command.size(`?x${height}`)
  }

  if (aspect) {
    command.autopad()
      .aspectRatio(aspect)
  }

  command.run()
})

const info = ({ inputPath }) => new Promise((resolve, reject) => {
  ffmpeg.ffprobe(inputPath, (err, metadata) => {
    if (err) {
      reject(err)
    }

    resolve(metadata)
  })
})

process.once('message', async parentJson => {
  let messageToParent

  try {
    const { action, params } = JSON.parse(parentJson)
    const actionMap = {
      'convert': convert,
      'info': info,
    }

    if (actionMap[action]) {
      messageToParent = {
        value: await actionMap[action](params)
      }
    } else {
      messageToParent = {
        error: `Unknown action="${action}"`
      }
    }
  } catch (e) {
    messageToParent = {
      error: e.message
    }
  }

  process.send(JSON.stringify(messageToParent))
})