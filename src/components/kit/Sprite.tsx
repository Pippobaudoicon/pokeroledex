import { cn } from "@/lib/utils";

const spriteUrl = (file: string | null | undefined, set: "box" | "book") => {
  const name = file?.trim();
  if (!name) return undefined;
  if (/^https?:\/\//i.test(name) || name.startsWith("/")) return name;
  return `/images/pokemon/${set === "box" ? "BoxSprites" : "BookSprites"}/${name}`;
};

/**
 * Pokémon picture in a fixed-size box, so nothing shifts while it loads.
 * "box" is the small pixel sprite for lists, "book" the 300px artwork.
 */
export const Sprite = ({
  image,
  set,
  className,
  eager = false,
}: {
  image: string | null | undefined;
  set: "box" | "book";
  className?: string;
  eager?: boolean;
}) => {
  const src = spriteUrl(image, set);
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center", className)}>
      {src && (
        <img
          src={src}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={cn("h-full w-full object-contain", set === "box" && "[image-rendering:pixelated]")}
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      )}
    </span>
  );
};
