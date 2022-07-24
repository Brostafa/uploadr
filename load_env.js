import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: join(__dirname, '.env')
})