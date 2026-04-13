import multer from 'multer';
import path from 'path';
import fs from 'fs';

const STORAGE_ROOT = process.env.STORAGE_ROOT || './storage';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const stock_id = req.params.stock_id;
    const category = req.body.category || 'Documents';
    const dest = path.join(STORAGE_ROOT, 'Cars', stock_id, category);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, file, cb) {
    // Keep original name, prefix with timestamp to avoid collisions
    const prefix = Date.now() + '-';
    cb(null, prefix + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export default upload;
