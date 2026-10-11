import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const RulebookButton = () => (
  <Button variant="white" asChild={true}>
    <Link to="/rulebook" title="Read and search the Pokérole 3.0 rulebook" className="gap-2">
      <BookOpen size={18} />Rulebook
    </Link>
  </Button>
);
