import '../load_env.js'
import path from 'path'
import express from 'express'
import multer from 'multer'
import logger from '../libs/logger.js'
import { handleUpload, handleWatch } from './controller.js'
import { fileURLToPath } from 'url'
import hbs from 'express-hbs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicPath = path.join(__dirname, '..', 'public')
const uploadsPath = path.join(publicPath, 'uploads')
const app = express()
const upload = multer({
  dest: uploadsPath,
  limits: { fieldSize: 250 * 1024 * 1024 }
})

const PORT = process.env.PORT || 9999

app.use(express.json())
// This is mainly for development, for production use NGINX or similar web server
// to improve performance
app.use(express.static(publicPath))
// Use `.hbs` for extensions
app.engine('hbs', hbs.express4())
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views')

app.post('/upload', upload.single('upload_file'), handleUpload(uploadsPath))
app.get('/w/:id', handleWatch())

app.listen(PORT, () => logger.info('Listening on port', PORT))