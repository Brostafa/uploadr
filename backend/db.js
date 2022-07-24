import { join, dirname } from 'path'
import { LowSync, JSONFileSync } from 'lowdb'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DBPATH = join(__dirname, 'db.json')

// Use JSON file for storage
const adapter = new JSONFileSync(DBPATH)
const db = new LowSync(adapter)

const defaultData = {
  videos: {}
}

db.read()
db.data = db.data || defaultData

export default db