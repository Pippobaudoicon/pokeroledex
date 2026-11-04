import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Check, ClipboardCheck, Pencil, Trash2, X } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTrainersControllerRemove } from "@/api/components";
import { Gender, Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBadge } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { type StatCategory, StatPointsCheckDialog } from "@/components/StatPointsCheck";
import { useToast } from "@/hooks/use-toast";
import { SOCIALS, TRAINER_ATTRIBUTES, TRAINER_SKILLS } from "@/lib/stats";
import { useTrainer } from "@/pages/MyTrainers/context";

const TRAINER_CATEGORIES: StatCategory[] = [
  { title: "Attributes", budget: "attributePoints", stats: TRAINER_ATTRIBUTES },
  { title: "Skills", budget: "skillPoints", stats: TRAINER_SKILLS },
  { title: "Socials", budget: "socialPoints", stats: SOCIALS },
];

export const TrainerSheetHeader = () => {
  const { updatedTrainer: trainer, editingMode, setEditingMode, saveTrainer, cancelEdit, updateTrainer } = useTrainer();
  const [deleting, setDeleting] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: remove, isPending } = useTrainersControllerRemove({
    onSuccess: () => {
      navigate("/myTrainers");
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast({ title: "Trainer deleted" });
    },
    onError: () => toast({ title: "Trainer couldn’t be deleted", description: "Please try again." }),
  });
  if (!trainer) return null;
  return (
    <>
      <PageHeader title={trainer.name} back={{ to: "/myTrainers", label: "Trainers" }}>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-subhead text-label-2">
          <RankBadge rank={trainer.rank} />
          <span>Age {trainer.age}</span>
          <button
            type="button"
            aria-label={`Gender: ${trainer.gender}. Switch`}
            className="flex h-11 items-center rounded-lg px-2 text-label hover:bg-fill lg:h-8"
            onClick={() => {
              const genders = Object.values(Gender);
              updateTrainer({ gender: genders[(genders.indexOf(trainer.gender) + 1) % genders.length] });
            }}
          >
            {trainer.gender === "M" ? "Male ♂" : trainer.gender === "F" ? "Female ♀" : "Unspecified"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {editingMode === "view" ? (
            <>
              <button type="button" className={button({ variant: "tinted" })} onClick={() => setEditingMode("edit")}>
                <Pencil aria-hidden className="size-4" />
                Edit
              </button>
              <button
                type="button"
                className={button({ variant: "gray" })}
                disabled={trainer.rank === Rank.CHAMPION}
                onClick={() => setEditingMode("rankUp")}
              >
                <ArrowUp aria-hidden className="size-4" />
                Rank up
              </button>
              <button type="button" className={button({ variant: "gray" })} onClick={() => setChecking(true)}>
                <ClipboardCheck aria-hidden className="size-4" />
                Check stat points
              </button>
              <button
                type="button"
                aria-label="Delete trainer"
                className={button({ variant: "destructive", size: "icon" })}
                onClick={() => setDeleting(true)}
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button type="button" className={button({ variant: "filled" })} onClick={saveTrainer}>
                <Check aria-hidden className="size-4" />
                Save
              </button>
              <button type="button" className={button({ variant: "gray" })} onClick={cancelEdit}>
                <X aria-hidden className="size-4" />
                Cancel
              </button>
              <span className="flex items-center px-1 text-footnote text-label-2">
                {editingMode === "rankUp" ? "Spend your new rank’s points below." : "Editing trainer"}
              </span>
            </>
          )}
        </div>
      </PageHeader>
      <StatPointsCheckDialog
        name={trainer.name}
        rank={trainer.rank}
        stats={trainer.stats}
        categories={TRAINER_CATEGORIES}
        skills={TRAINER_SKILLS}
        open={checking}
        onOpenChange={setChecking}
      />
      <Sheet open={deleting} onOpenChange={setDeleting} title={`Delete ${trainer.name}?`} description="This action cannot be undone.">
        <div className="flex flex-col gap-3 p-4">
          <button
            type="button"
            className={button({ variant: "filled" })}
            disabled={isPending}
            onClick={() => remove({ pathParams: { id: trainer.id } })}
          >
            {isPending ? "Deleting…" : "Delete trainer"}
          </button>
          <button type="button" className={button({ variant: "gray" })} onClick={() => setDeleting(false)}>
            Keep trainer
          </button>
        </div>
      </Sheet>
    </>
  );
};
