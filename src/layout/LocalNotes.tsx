import * as React from "react";
import { useFeedbackControllerCreate } from "@/api/components";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
export const LocalNotes = () => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const createFeedback = useFeedbackControllerCreate();
  const { toast } = useToast();
  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!message || message.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a note.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createFeedback.mutateAsync({
        body: {
          name: name || undefined,
          email: email || undefined,
          message,
        },
      });
      setOpen(false);
      setName("");
      setEmail("");
      setMessage("");
      toast({
        title: "Note Saved",
        description:
          "Saved to this app's database. Nothing was sent to the original website.",
      });
    } catch (error) {
      console.error("Feedback submit failed", error);
      toast({
        title: "Submission Failed",
        description: "Saving the local note failed. Please try again.",
        variant: "destructive",
      });
    }
  };
  const canSubmit = message.trim().length > 0;
  return (
    <div className="inline-block">
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="shadow-lg rounded-md">
          <DialogTrigger asChild={true}>
            <Button variant="beige" size="equalPadding">
              Local Notes
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save a Local Note</DialogTitle>
            <DialogDescription>
              Record bugs and ideas for this copy. Notes are saved in this
              app's database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <Text
              size="text-sm"
              font="font-move"
              className="text-pokerole-black"
            >
              Name (optional)
            </Text>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
            <Text
              size="text-sm"
              font="font-move"
              className="text-pokerole-black"
            >
              Email (optional)
            </Text>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              type="email"
            />
            <Text
              size="text-sm"
              font="font-move"
              className="text-pokerole-black"
            >
              Message
            </Text>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe the bug or feature idea..."
              className="min-h-[120px] rounded-3xl bg-pokerole-beige-light p-3 text-lg font-move text-pokerole-black focus:outline-none focus:ring-2 focus:ring-pokerole-black"
            />
            <DialogFooter>
              <DialogClose asChild={true}>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={createFeedback.isPending}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                variant="green"
                type="submit"
                disabled={createFeedback.isPending || !canSubmit}
              >
                {createFeedback.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
