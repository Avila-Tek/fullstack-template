import { TUser } from '@repo/schemas';
import { Document, model, Schema, Types } from 'mongoose';

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

export const User = model<typeof userSchema>('User', userSchema);
