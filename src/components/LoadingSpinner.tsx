import { CgPokemon } from "react-icons/cg";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className }: LoadingSpinnerProps) => (
  <div>
    <CgPokemon className={cn(`animate-spin text-white w-32 h-32 ${className}`)} />
  </div>
);
