import * as React from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

export type LoadingImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

/** <img> that shows a spinner until it has loaded. */
export const LoadingImage = (props: LoadingImageProps) => {
  const [loading, setLoading] = React.useState(true);
  return (
    <>
      {loading && <LoadingSpinner className="w-full h-full" />}
      <img
        {...props}
        onLoad={() => {
          setLoading(false);
        }}
        className={cn(props.className, loading ? "hidden" : "")}
      />
    </>
  );
};
