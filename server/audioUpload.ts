import type { Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
  },
});

export const handleAudioUpload = upload.single("file");

export async function uploadAudio(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileKey = `audio/${timestamp}-${randomSuffix}.webm`;

    const { url } = await storagePut(
      fileKey,
      file.buffer,
      file.mimetype || "audio/webm"
    );

    res.json({ url, key: fileKey });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
}
