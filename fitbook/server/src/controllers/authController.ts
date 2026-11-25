import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryEnabled, env } from '../config/env';
import * as authService from '../services/authService';
import { badRequest } from '../utils/errors';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

export const register = async (req: Request, res: Response) => {
  const { confirmPassword, ...rest } = req.body;
  void confirmPassword;
  const result = await authService.registerUser(rest);
  ok(res, result, 201);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body.email, req.body.password);
  ok(res, result);
};

export const refresh = async (req: Request, res: Response) => {
  const result = await authService.refreshSession(req.body.refreshToken);
  ok(res, result);
};

export const logout = async (req: Request, res: Response) => {
  await authService.logoutUser(req.body?.refreshToken);
  ok(res, { loggedOut: true });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { devToken } = await authService.forgotPassword(req.body.email);
  ok(res, {
    message: 'If an account exists for this email, a password reset link has been sent.',
    ...(devToken ? { devResetToken: devToken } : {}),
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  ok(res, { message: 'Password has been reset. Please log in with your new password.' });
};

export const verifyEmail = async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);
  ok(res, { message: 'Email verified successfully.' });
};

export const me = async (req: Request, res: Response) => {
  ok(res, await authService.getProfile(req.user!.id));
};

export const updateMe = async (req: Request, res: Response) => {
  ok(res, await authService.updateProfile(req.user!.id, req.body));
};

export const changePassword = async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  ok(res, { message: 'Password changed. Please log in again.' });
};

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) throw badRequest('No image file was uploaded', 'NO_FILE');
  let url: string;
  if (cloudinaryEnabled) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'fitbook/avatars' }, (err, res) => {
        if (err || !res) reject(err ?? new Error('Upload failed'));
        else resolve(res as { secure_url: string });
      });
      stream.end(req.file!.buffer);
    });
    url = result.secure_url;
  } else {
    const uploadsDir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `${req.user!.id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
    url = `/uploads/${filename}`;
  }
  const user = await authService.updateProfile(req.user!.id, { profileImage: url });
  ok(res, user);
};
