import { type InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaSave, FaWrench } from "react-icons/fa";
import { FaTrash, FaXmark } from "react-icons/fa6";
import { GrUpgrade } from "react-icons/gr";
import { useNavigate } from "react-router-dom";
import type * as T from "../../../shared/types";
import { useTrainersControllerRemove } from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Gender, Rank } from "@/api/schemas";
import { Box } from "@/components/Box";
import { CollapsableButton } from "@/components/CollapsableButton";
import { GenderIcon } from "@/components/GenderIcon";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type EditableTrainer, useTrainer } from "@/pages/MyTrainers/context";

const TrainerGenderToggle = ({ className }: { className?: string }) => {
  const { updatedTrainer, updateTrainer } = useTrainer();
  const cycleGender = () => {
    if (updatedTrainer == null) return;
    const genders = Object.values(Gender);
    updateTrainer({
      gender: genders[(genders.indexOf(updatedTrainer.gender) + 1) % genders.length] ?? Gender.N,
    });
  };
  return (
    <div className="hover:cursor-pointer hover:bg-pokerole-black-light rounded-3xl p-1">
      {updatedTrainer != null && (
        <GenderIcon onClick={cycleGender} gender={updatedTrainer.gender} className={className} />
      )}
    </div>
  );
};

const DeleteTrainerDialog = ({ children, trainer }: { children: React.ReactNode; trainer: EditableTrainer }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutate } = useTrainersControllerRemove({
    onSuccess: () => {
      toast({
        title: "Trainer deleted",
        description: (
          <>
            <span>Your trainer has been deleted.</span>
          </>
        ),
      });
      navigate("/myTrainers");
      // Bare query keys are read as filters, so each call invalidates every query (original behaviour).
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/trainers/{id}",
          operationId: "trainersControllerFindOne",
          variables: {
            pathParams: {
              id: trainer.id,
            },
          },
        }) as InvalidateQueryFilters,
      );
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/trainers",
          operationId: "trainersControllerFindAll",
          variables: {},
        }) as InvalidateQueryFilters,
      );
    },
    onError: (error) => {
      toast({
        title: "Failed to delete trainer",
        // apiFetch errors carry no payload, so this is always undefined (kept from the hosted build).
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });
  const deleteTrainer = () => {
    mutate({
      pathParams: {
        id: trainer.id,
      },
    });
  };
  return (
    <Dialog>
      <DialogTrigger asChild={true}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {"Are you sure you want to delete "}
            {trainer.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button variant="red" onClick={deleteTrainer}>
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const DeleteTrainerButton = () => {
  const { updatedTrainer } = useTrainer();
  if (updatedTrainer == null) return null;
  return (
    <DeleteTrainerDialog trainer={updatedTrainer}>
      <CollapsableButton
        text="Delete Trainer"
        icon={<FaTrash size={20} />}
        variant="red"
      />
    </DeleteTrainerDialog>
  );
};

export const TrainerSheetHeader = () => {
  const { baseTrainer, updatedTrainer, isLoading, editingMode, setEditingMode, saveTrainer, cancelEdit } =
    useTrainer();
  return (
    <Box
      color="bg-pokerole-black"
      className="p-2 col-span-full flex flex-row gap-2 items-center justify-between"
    >
      {isLoading && <Text color="text-white">Loading...</Text>}
      {!isLoading && baseTrainer == null && <Text color="text-white">No Trainer found</Text>}
      {baseTrainer != null && updatedTrainer != null && (
        <>
          <div className="md:col-span-5 col-span-full flex flex-row space-x-2 items-center">
            <Text color="text-white">
              {"Name: "}
              {baseTrainer.name}
            </Text>
            <TrainerGenderToggle />
            <Text color="text-white">
              {"Age: "}
              {baseTrainer.age}
            </Text>
          </div>
          <div className="flex flex-row md:justify-end justify-center space-x-1 text-white leading-none md:col-span-2 col-span-full">
            {editingMode === "view" ? (
              <>
                <CollapsableButton
                  onClick={() => {
                    setEditingMode("rankUp");
                  }}
                  text="Rank Up"
                  icon={<GrUpgrade size={20} />}
                  variant="blue"
                  disabled={updatedTrainer.rank === Rank.CHAMPION}
                />
                <CollapsableButton
                  onClick={() => {
                    setEditingMode("edit");
                  }}
                  text="Edit"
                  icon={<FaWrench size={20} />}
                  variant="yellow"
                />
                <DeleteTrainerButton />
              </>
            ) : (
              <>
                <CollapsableButton
                  onClick={() => {
                    saveTrainer();
                  }}
                  text="Save"
                  icon={<FaSave size={20} />}
                  variant="green"
                />
                <CollapsableButton
                  onClick={() => {
                    cancelEdit();
                  }}
                  text="Cancel"
                  icon={<FaXmark size={20} />}
                  variant="red"
                />
              </>
            )}
          </div>
        </>
      )}
    </Box>
  );
};
