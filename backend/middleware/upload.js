import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', process.env.STORAGE_ROOT || 'storage');

// In cloud mode (Vercel), use memory storage — the route handler uploads to Vercel Blob.
// In local mode, use disk storage as before.
export const IS_CLOUD = !!process.env.BLOB_READ_WRITE_TOKEN;

let upload;

if (IS_CLOUD) {
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
  });
} else {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const stock_id = req.params.stock_id;
      const category = req.body.category || 'Documents';
      const dest = path.join(STORAGE_ROOT, 'Cars', stock_id, category);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename(req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
}

export default upload;
