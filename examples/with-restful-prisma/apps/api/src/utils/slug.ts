import { Document, Types } from 'mongoose';

export function createSlug(_id: Types.ObjectId): string {
  // Head
  const timestamp = Date.now() * 10000;
  const head = String(Date.now()).slice(0, 4);
  // Body
  const timestampBody = Number(String(timestamp).slice(3));
  const numericId = processCollectionId(_id);
  const random = getRandomInt(0, 5e15);
  const body = String(numericId + random + timestampBody).slice(0, 14);
  // Tail
  const tail = String(getRandomInt(10, 99));

  const slug = head + body + tail;
  return slug;
}

export async function createUniqueSlug(
  _id: Types.ObjectId,
  model: any
): Promise<string> {
  const slugs = Array.from({ length: 10 }, () => createSlug(_id));
  const docs = (await model.find({ slug: { $in: slugs } })) as (Document & {
    slug: string;
  })[];
  const slug = slugs.find((s) => !docs.find((m) => m.slug === s)) as string;
  return slug;
}

function processCollectionId(_id: Types.ObjectId): number {
  const numericId = String(_id).replace(/\D/g, '').slice(0, 14);
  return Number(numericId);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
