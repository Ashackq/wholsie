import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Resolve upload directory relative to server's root directory
const uploadDir = path.join(process.cwd(), "../public/assets/uploaded");

// ── Allowed MIME types per upload type ────────────────────────────────────────
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MEDIA_TYPES = [
  ...IMAGE_TYPES,
  "video/mp4",
  "video/webm",
  "video/ogg",
  "image/gif", // GIFs allowed explicitly for media section
];

// ── Destination folder resolution ─────────────────────────────────────────────
function resolveDestination(type: string): string {
    switch (type) {
        case "category":
            return path.join(uploadDir, "menu_category");
        case "product":
            return path.join(uploadDir, "products");
        case "offer":
            return path.join(uploadDir, "offers");
        case "media":
            return path.join(uploadDir, "media");
        default:
            return uploadDir;
    }
}

// ── Relative URL path for the response ────────────────────────────────────────
function resolveRelativePath(type: string, filename: string): string {
    switch (type) {
        case "category":
            return `/assets/uploaded/menu_category/${filename}`;
        case "product":
            return `/assets/uploaded/products/${filename}`;
        case "offer":
            return `/assets/uploaded/offers/${filename}`;
        case "media":
            return `/assets/uploaded/media/${filename}`;
        default:
            return `/assets/uploaded/${filename}`;
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type as string;
        const targetFolder = resolveDestination(type);

        // Ensure directory exists
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }
        cb(null, targetFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req: Request, file: Express.Multer.File | any, cb: any) => {
    const type = req.query.type as string;
    const isMediaUpload = type === "media" || type === "offer";
    const allowed = isMediaUpload ? MEDIA_TYPES : IMAGE_TYPES;

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const label = isMediaUpload
            ? "Images (JPEG, PNG, GIF, WEBP, SVG), MP4, or WebM video"
            : "Images (JPEG, PNG, GIF, WEBP, SVG)";
        cb(new Error(`Only ${label} files are allowed`), false);
    }
};

// ── Multer instances ───────────────────────────────────────────────────────────
// Standard image upload (5 MB)
export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Media/video upload (50 MB) — used for offer banners and homepage media
export const uploadMedia = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
});

// ── Upload handler ─────────────────────────────────────────────────────────────
export async function uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const type = req.query.type as string;
        const relativePath = resolveRelativePath(type, req.file.filename);

        res.json({
            success: true,
            message: "File uploaded successfully",
            filePath: relativePath,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        next(error);
    }
}

