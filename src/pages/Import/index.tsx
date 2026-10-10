import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box } from "@/components/Box";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Text } from "@/components/Text";
import { Button, buttonVariants } from "@/components/ui/button";

interface ImportResult {
  counts: Record<string, number>;
  missing: string[];
  skipped: number;
}

type ImportState =
  | { status: "idle" | "running" }
  | { status: "done"; result: ImportResult }
  | { status: "error"; message: string };

const labels: Record<string, string> = {
  pokemon: "Pokémon",
  trainers: "Trainers",
  campaigns: "Campaigns",
  moves: "Custom moves",
  abilities: "Custom abilities",
  items: "Custom items",
  "pokemon-templates": "Custom Pokémon",
};

// Only a bookmark made in this browser starts an import by itself, so a link carrying
// someone else's token cannot fill your account; such a token waits in the box for a click.
const readNonce = () => {
  try {
    let nonce = localStorage.getItem("import-nonce");
    if (!nonce) localStorage.setItem("import-nonce", (nonce = crypto.randomUUID()));
    return nonce;
  } catch {
    return crypto.randomUUID();
  }
};

// Runs on pokeroledex.nl: it catches the login token from the app's next API request and
// brings it back here. Switching to My Pokémon (or My Trainers) makes the app send one.
const bookmarklet = (back: string) =>
  "javascript:" +
  encodeURIComponent(
    `(()=>{if(!/(^|\\.)pokeroledex\\.nl$/.test(location.hostname)){alert("Open pokeroledex.nl, log in, then use this bookmark there.");return}` +
      `const f=window.fetch;window.fetch=function(u,o){const h=(o&&o.headers)||{};` +
      `const a=h instanceof Headers?h.get("authorization"):h.Authorization||h.authorization;` +
      `if(a){window.fetch=f;location.href=${JSON.stringify(back)}+encodeURIComponent(a)}return f.apply(this,arguments)};` +
      `history.pushState(null,"",location.pathname==="/myPokemon"?"/myTrainers":"/myPokemon");dispatchEvent(new PopStateEvent("popstate"));` +
      `setTimeout(()=>alert("No login found. Log in on pokeroledex.nl first, then use the bookmark again."),8000)})()`,
  );

export const ImportPage = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState("");
  const [state, setState] = React.useState<ImportState>({ status: "idle" });
  const link = React.useRef<HTMLAnchorElement>(null);
  const [nonce] = React.useState(readNonce);
  const code = bookmarklet(`${window.location.origin}/import#nonce=${nonce}&token=`);

  // React warns about javascript: URLs written in JSX.
  React.useEffect(() => {
    link.current?.setAttribute("href", code);
  }, [code]);

  const runImport = React.useCallback(
    async (value: string) => {
      setState({ status: "running" });
      try {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.payload);
        await queryClient.invalidateQueries();
        setState({ status: "done", result: body });
      } catch (e) {
        setState({ status: "error", message: (e instanceof Error && e.message) || "The import failed. Please try again." });
      }
    },
    [queryClient],
  );

  // The bookmark brings people back with the token in the hash, which is never sent to a server.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const value = params.get("token");
    if (!value) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (params.get("nonce") === nonce) runImport(value);
    else setToken(value);
  }, [runImport, nonce]);

  return (
    <div className="flex flex-col gap-4 p-5 max-w-3xl">
      <Text color="text-white">Import from pokeroledex.nl</Text>
      <Box color="bg-pokerole-beige" className="p-5 flex flex-col gap-3">
        <Text size="text-xl">1. Add the bookmark</Text>
        <Text size="text-base" font="font-move">
          Drag this button to your bookmarks bar. On a phone, copy the code, bookmark any page and replace the bookmark's
          address with the code. On a computer you can instead paste the code into the developer-tools console on
          pokeroledex.nl.
        </Text>
        <div className="flex flex-wrap gap-2">
          <a ref={link} className={buttonVariants({ variant: "red" })}>
            Grab my pokeroledex.nl data
          </a>
          {/* Decoded, the code also runs when pasted into the developer-tools console:
              the leading "javascript:" reads as a statement label there. */}
          <Button variant="white" onClick={() => navigator.clipboard.writeText(decodeURIComponent(code))}>
            Copy code
          </Button>
        </div>
        <Text size="text-xl">2. Use it on pokeroledex.nl</Text>
        <Text size="text-base" font="font-move">
          Log in at pokeroledex.nl and open the bookmark. It brings you back here and copies your Pokémon, trainers and
          campaigns into your account. Importing again updates them instead of making copies. If you had to log in here
          first, open the bookmark on pokeroledex.nl once more.
        </Text>
      </Box>
      <Box color="bg-pokerole-beige" className="p-5 flex flex-col gap-3">
        <Text size="text-xl">Or paste your login token</Text>
        <Text size="text-base" font="font-move">
          In a desktop browser, log in at pokeroledex.nl, open the developer tools on the Network tab and open My
          Pokémon. Click a request to /api and copy the value of its Authorization request header.
        </Text>
        <textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="bearer eyJ..."
          className="min-h-[120px] rounded-3xl bg-pokerole-beige-light p-3 text-lg font-move text-pokerole-black focus:outline-none focus:ring-2 focus:ring-pokerole-black"
        />
        <div>
          <Button variant="green" disabled={state.status === "running" || !token.trim()} onClick={() => runImport(token)}>
            Import
          </Button>
        </div>
      </Box>
      {state.status === "running" && (
        <div className="flex items-center gap-2">
          <LoadingSpinner className="h-12 w-16" />
          <Text size="text-xl" color="text-white">
            Importing…
          </Text>
        </div>
      )}
      {state.status === "error" && (
        <Box color="bg-pokerole-red" className="p-5">
          <Text size="text-xl" color="text-white">
            {state.message}
          </Text>
        </Box>
      )}
      {state.status === "done" && (
        <Box color="bg-pokerole-beige" className="p-5 flex flex-col gap-3">
          <Text size="text-xl">Imported</Text>
          {Object.entries(state.result.counts).map(([name, count]) => (
            <Text key={name} size="text-base" font="font-move">
              {labels[name] ?? name}: {count}
            </Text>
          ))}
          {state.result.skipped > 0 && (
            <Text size="text-base" font="font-move">
              {state.result.skipped} Pokémon were skipped: their species is newer than this site's Pokédex.
            </Text>
          )}
          {state.result.missing.length > 0 && (
            <Text size="text-base" font="font-move">
              Some moves, abilities, natures or items are newer than this site's data and won't show:{" "}
              {state.result.missing.join(", ")}
            </Text>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to="/myPokemon" className={buttonVariants({ variant: "red" })}>
              My Pokémon
            </Link>
            <Link to="/myTrainers" className={buttonVariants({ variant: "red" })}>
              My Trainers
            </Link>
          </div>
        </Box>
      )}
    </div>
  );
};
