/**
 * ffmpeg sometimes crashes the main process when it runs into error
 * so I settled for parent/child approach to sandbox ffmpeg from doing that
 * 
 */
import { fileURLToPath } from 'url'
import { fork } from 'child_process'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sendToChild = (action, params) => new Promise((resolve, reject) => {
  try {
    const child = fork(join(__dirname, './child.js'))

    child.on('message', jsonMsg => {
      const { error, value } = JSON.parse(jsonMsg)

      child.kill()

      if (error) {
        // Convert error to an actual js error because child returns strings
        reject(new Error(error))
      } else {
        resolve(value)
      }
    })

    child.send(JSON.stringify({ action, params }))
  } catch (e) {
    reject(e)
  }
})

export const convert = async ({
  inputPath, outputExt = '.mp4', fps, aspect, height, ...rest
}) => {
  const outputPath = await sendToChild('convert', {
    inputPath,
    outputExt,
    fps,
    aspect,
    height,
    ...rest
  })

  return {
    outputPath
  }
}

export const info = async inputPath => {
  const data = await sendToChild('info', { inputPath })
  let video
  let audio

  data.streams.forEach(stream => {
    const {
      bit_rate: bitRate,
      codec_name: codecName,
      codec_type: codecType,
      coded_height: height,
      coded_width: width,
      duration: durationInSec,
      avg_frame_rate,
    } = stream

    if (codecType === 'video') {
      video = {
        codecName,
        codecType,
        durationInSec,
        width,
        height,
        bitRate,
        fps: Number(avg_frame_rate.split('/')[0])
      }
    } else {
      audio = {
        codecName,
        codecType,
      }
    }
  })

  return {
    video,
    audio
  }
}
