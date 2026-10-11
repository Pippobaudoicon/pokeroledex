import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RulebookButton = () => (
  <Button variant="white" asChild={true}>
    <a
      href="https://www.mediafire.com/file/ciqdxrua7ur81q5/POKEROLE_COREBOOK_3.0.pdf/file"
      target="_blank"
      rel="noopener noreferrer"
      title="Download the Pokérole 3.0 rulebook (PDF)"
      className="gap-2"
    >
      <BookOpen size={18} />Rulebook
    </a>
  </Button>
);
