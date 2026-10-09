import { LocalWorkspaceLabel } from "@/layout/SessionIndicator";
export const SupportButton = () => (
  <div id="nav-ko-fi-button" className="hidden md:block">
    <div className="shadow-lg rounded-md">
      <LocalWorkspaceLabel
        kofiID="eliturbo"
        title="Support PokéroleDex on Ko-fi"
        color="#FFD166"
      />
    </div>
  </div>
);
