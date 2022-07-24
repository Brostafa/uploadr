import '../load_env.js'
import fs from 'fs'
import net from 'net'
import { fileFromPath } from 'formdata-node/file-from-path'
import { FormData } from 'formdata-node'
import { convert } from '../libs/ffmpeg/wrapper.js'
import logger from '../libs/logger.js'

const IPC_PATH = '/tmp/upload_vid.sock'
const UPLOAD_ENDPOINT = process.env.SERVER_URL + '/upload'

const unixSocketServer = net.createServer({
  allowHalfOpen: true
})

// If unclean exit
if (fs.existsSync(IPC_PATH)) {
  fs.unlinkSync(IPC_PATH)
}

const convertVid = async inputPath => {
  const now = Date.now()
  const { outputPath } = await convert({
    inputPath,
    // 30fps is 25% smaller than 60fps
    fps: 30
  })
  const timeTakenSec = Math.round((Date.now() - now) / 1000)

  return {
    msg: `Time Taken: ${timeTakenSec}s\r\nOutput: ${outputPath}`,
    outputPath,
  }
}

const uploadVid = async inputPath => {
  const { got } = await import('got')
  const form = new FormData()

  form.set('upload_file', await fileFromPath(inputPath))

  got.post(UPLOAD_ENDPOINT, {
    body: form
  })

  return {
    msg: '1'
  }
}

const handleConnection = socket => {
  let jsonData = ''
  let response

  socket.on('data', d => jsonData += d.toString())

  const handleEndTransmission = async () => {
    try {
      logger.info('Received Data -> ', jsonData.trim())

      const { inputPath, action } = JSON.parse(jsonData)

      if (action === 'convert' && inputPath) {
        response = await convertVid(inputPath)
      } else if (action === 'upload' && inputPath) {
        response = await uploadVid(inputPath)
      } else {
        response = {
          msg: `Failed - Unknown action or missing inputFile. inputPath="${inputPath}" action="${action}"`,
          error: true
        }
      }
    } catch (e) {
      response = {
        msg: 'Error - ' + e.message,
        error: true,
      }

      logger.error('Internal err', e)
    }

    socket.write(JSON.stringify(response))
    socket.end()
  }

  socket.on('end', handleEndTransmission)
}

unixSocketServer.on('connection', handleConnection)

unixSocketServer.listen(IPC_PATH, () => logger.info('now listening'))
