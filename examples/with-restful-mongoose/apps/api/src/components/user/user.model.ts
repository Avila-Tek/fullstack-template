import { TUser } from '@repo/schemas';
import { Document, model, models, Schema, Types } from 'mongoose';

export type TUserDocument = Document<
  Types.ObjectId,
  any,
  TUser,
  Record<string, any>
> &
  TUser;

const userSchema = new Schema<TUser>(
  {
    firstName: {
      type: String,
      trim: true,
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Check if model already exists to avoid OverwriteModelError
export const User = models.User || model<typeof userSchema>('User', userSchema);
