interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

/*
  Unsplash is already a resizing image CDN, so each photo is requested at the
  width the browser picks from the image's `sizes`. This keeps downloads small
  without spending Vercel image-optimisation quota.
*/
export default function imageLoader({ src, width, quality }: LoaderArgs) {
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 70));
  return url.toString();
}
