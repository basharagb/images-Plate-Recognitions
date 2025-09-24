import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateImageFile } from '../utils/fileUtils';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    
    const filename = `${name}_${timestamp}_${uuid}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const error = validateImageFile(file);
  if (error) {
    return cb(new Error(error));
  }
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Maximum 10 files per request
  },
});

export default upload;
