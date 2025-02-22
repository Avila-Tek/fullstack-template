import { z } from 'zod';
import { userDefinition } from './user.dto';
import { Document, type Types, Schema } from 'mongoose';

export type IUser = z.infer<typeof userDefinition>;

export type UserDocument = IUser & Document<Types.ObjectId, object, IUser>;

export const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
