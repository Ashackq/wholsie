import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Resolve upload directory relative to server's root directory
const uploadDir = path.join(process.cwd(), "../public/assets/uploaded");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type as string;
        let targetFolder = uploadDir;

        if (type === "category") {
            targetFolder = path.join(uploadDir, "menu_category");
        } else if (type === "product") {
            targetFolder = path.join(uploadDir, "products");
        }

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
    }
});

const fileFilter = (req: Request, file: Express.RayFile | any, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only images (JPEG, PNG, GIF, WEBP, SVG) are allowed"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const type = req.query.type as string;
        let relativePath = "";

        if (type === "category") {
            relativePath = `/assets/uploaded/menu_category/${req.file.filename}`;
        } else if (type === "product") {
            relativePath = `/assets/uploaded/products/${req.file.filename}`;
        } else {
            relativePath = `/assets/uploaded/${req.file.filename}`;
        }

        res.json({
            success: true,
            message: "File uploaded successfully",
            filePath: relativePath
        });
    } catch (error) {
        next(error);
    }
}
