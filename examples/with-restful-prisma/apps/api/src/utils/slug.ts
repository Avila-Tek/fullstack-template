
export function createSlug(id: string): string {
  // Head
  const timestamp = Date.now() * 10000;
  const head = String(Date.now()).slice(0, 4);
  // Body
  const timestampBody = Number(String(timestamp).slice(3));
  const numericId = processStringId(id);
  const random = getRandomInt(0, 5e15);
  const body = String(numericId + random + timestampBody).slice(0, 14);
  // Tail
  const tail = String(getRandomInt(10, 99));

  const slug = head + body + tail;
  return slug;
}

export async function createUniqueSlug(
  id: string,
  prismaModel: any
): Promise<string> {
  const slugs = Array.from({ length: 10 }, () => createSlug(id));
  const docs = await prismaModel.findMany({
    where: {
      slug: {
        in: slugs,
      },
    },
    select: {
      slug: true,
    },
  });
  const slug = slugs.find((s) => !docs.find((m: any) => m.slug === s)) as string;
  return slug;
}

function processStringId(id: string): number {
  const numericId = String(id).replace(/\D/g, '').slice(0, 14);
  return Number(numericId) || Date.now();
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
