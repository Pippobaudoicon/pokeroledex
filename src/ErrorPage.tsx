import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export const ErrorPage = () => {
  const error = useRouteError();
  return (
    <div id="error-page" className="flex flex-col gap-8 justify-center items-center h-screen">
      <h1 className="text-4xl font-bold">Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p className="text-slate-400">
        <i>{getErrorMessage(error)}</i>
      </p>
    </div>
  );
};

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error !== undefined && "message" in (error as object)) return (error as Error).message;
  if (typeof error == "string") return error;
  console.error(error);
  return "Unknown error";
}
