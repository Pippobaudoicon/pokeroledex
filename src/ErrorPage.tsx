import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { button } from "@/components/kit/button";
import { Pokeball } from "@/components/kit/Pokeball";

const Message = ({ title, detail }: { title: string; detail: string }) => (
  <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
    <div className="flex max-w-sm flex-col items-center gap-3">
      <Pokeball className="size-16 text-label-3" strokeWidth={5} />
      <h1 className="font-display text-title-1">{title}</h1>
      <p className="text-body text-label-2">{detail}</p>
      <div className="mt-2 flex gap-2">
        <Link to="/" className={button({ variant: "filled" })}>
          Go home
        </Link>
        <Link to="/pokemon" className={button({ variant: "gray" })}>
          Open the Pokédex
        </Link>
      </div>
    </div>
  </div>
);

const RouteError = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return <Message title="Something went wrong" detail={getErrorMessage(error)} />;
};

const NotFound = () => <Message title="Page not found" detail="This page wandered into the tall grass. Try Search, or head back home." />;

export const ErrorPage = ({ notFound = false }: { notFound?: boolean }) => (notFound ? <NotFound /> : <RouteError />);

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error !== undefined && "message" in (error as object)) return (error as Error).message;
  if (typeof error == "string") return error;
  console.error(error);
  return "Unknown error";
}
