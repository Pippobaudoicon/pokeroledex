import { type InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { CgPokemon } from "react-icons/cg";
import { Link, useParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import {
  useTrainersControllerCreate,
  useTrainersControllerFindAll,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Rank } from "@/api/schemas";
import { AddNewBox } from "@/components/AddNewBox";
import { Box } from "@/components/Box";
import { GenderIcon } from "@/components/GenderIcon";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { NatureSelect } from "@/components/NatureSelect";
import { RankIcon } from "@/components/RankIcon";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { TrainerProvider } from "@/pages/MyTrainers/context";
import { TrainerSheet } from "@/pages/MyTrainers/TrainerSheet";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
const TrainerCard = ({
  name,
  gender,
  rank,
  className,
  onClick,
}: {
  name: string;
  gender: T.Gender;
  rank: T.Rank;
  className?: string;
  onClick?: () => void;
}) => (
  <Box
    color="bg-pokerole-red"
    className={`${className} flex flex-col items-center justify-center space-y-2 p-3 bg-gradient-to-br from-type-steel-light ${onClick != null ? "hover:bg-pokerole-red-light hover:from-pokerole-red-light" : ""}`}
    onClick={onClick}
  >
    <div className="flex flex-row items-center gap-2">
      <RankIcon rank={rank} size="md" />
      <Text size="text-3xl" color="text-white">
        {name}
      </Text>
      <GenderIcon gender={gender} />
    </div>
  </Box>
);
const CreateTrainerDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTrainer, setNewTrainer] = React.useState<{ name: string; age: number; natureId: string; rank: T.Rank }>({
    name: "",
    age: 0,
    natureId: "",
    rank: Rank.UNRANKED,
  });
  // The picked nature is only shown; it never reaches newTrainer.natureId (original behaviour).
  const [nature, setNature] = React.useState<T.Nature | undefined>(undefined);
  const { mutate } = useTrainersControllerCreate({
    onSuccess: () => {
      toast({
        title: "Trainer added",
        description: (
          <>
            <span>Your trainer has been added.</span>
          </>
        ),
      });
      // A bare query key is read as filters, so this invalidates every query (original behaviour).
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/trainers",
          operationId: "trainersControllerFindAll",
          variables: {},
        }) as InvalidateQueryFilters,
      );
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add trainer",
        // apiFetch errors carry no payload, so this is always undefined (kept from the hosted build).
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });
  const createTrainer = () => {
    if (newTrainer.name === "") {
      toast({
        title: "Failed to add trainer",
        description: "Name is required.",
      });
      return;
    }
    mutate({
      body: newTrainer,
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Trainer</DialogTitle>
          <DialogDescription>
            Add a new trainer to your collection.
          </DialogDescription>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl flex-grow min-w-20">Name:</Text>
            <Input
              placeholder="Name"
              value={newTrainer.name}
              onChange={(event) => {
                setNewTrainer({
                  ...newTrainer,
                  name: event.target.value,
                });
              }}
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Age:</Text>
            <Input
              type="number"
              placeholder="Age"
              value={newTrainer.age}
              onChange={(event) => {
                setNewTrainer({
                  ...newTrainer,
                  age: parseInt(event.target.value),
                });
              }}
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Nature:</Text>
            <NatureSelect
              nature={nature}
              setSelectNature={(picked) => {
                if (picked != null) setNature(picked);
              }}
              comboBoxClassName="text-xl"
              className="flex-grow"
              placeholder="Select Nature..."
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Rank:</Text>
            <RankSelect
              rank={newTrainer.rank}
              onSelect={(rank) => {
                if (rank !== undefined)
                  setNewTrainer({
                    ...newTrainer,
                    rank,
                  });
              }}
              comboBoxClassName="text-xl"
              placeholder="Select Rank..."
              className="flex-grow"
            />
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="green"
            onClick={() => {
              createTrainer();
            }}
            className="flex-grow"
          >
            Add Trainer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const TrainerList = ({ className, onClick }: { className?: string; onClick?: (id: string) => void }) => {
  const { data: trainers, isFetching } = useTrainersControllerFindAll({});
  const isLoading = isFetching && trainers == null;
  const [search, setSearch] = React.useState("");
  // Sorts the cached query data in place (original behaviour).
  const filteredTrainers = React.useMemo(
    () =>
      trainers
        ?.sort((a, b) => a.name.localeCompare(b.name))
        .filter((trainer) => trainer.name.toLowerCase().includes(search.toLowerCase())),
    [trainers, search],
  );
  const trainerCards = React.useMemo(
    () =>
      filteredTrainers?.map((trainer) => (
        // The key sits on the Link inside an unkeyed fragment, so React warns in dev (original behaviour).
        <>
          <Link
            key={trainer.id}
            to={`/myTrainers/${trainer.id}`}
            className="flex flex-col"
          >
            <TrainerCard
              key={trainer.id}
              name={trainer.name}
              gender={trainer.gender}
              rank={trainer.rank}
              onClick={() => onClick?.(trainer.id)}
              className="flex-grow"
            />
          </Link>
        </>
      )),
    [filteredTrainers],
  );
  return (
    <div className={`flex flex-col space-y-2 h-full overflow-hidden ${className}`}>
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="rounded-t-3xl flex-1">
        <div className="grid grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 gap-2">
          {isLoading && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {trainerCards}
          {!isLoading && (
            <div id="create-trainer-button" className="flex">
              <CreateTrainerDialog
                trigger={
                  <AddNewBox
                    id="trainer-add-button"
                    className="p-0 flex-grow"
                  />
                }
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
export const MyTrainersPage = () => {
  const { id } = useParams();
  const [selectedId, setSelectedId] = React.useState(id);
  const detailRef = useScrollToDetail(selectedId);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    setSelectedId(id);
  }, [id]);
  const SheetContainer: React.ElementType = isDesktop ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <TrainerList
        className="md:col-span-1 col-span-full max-md:min-h-[15vh] max-md:max-h-[35vh]"
        onClick={(trainerId) => {
          setSelectedId(trainerId);
        }}
      />
      <SheetContainer ref={detailRef} className="md:col-span-3 col-span-full h-full">
        {selectedId === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <CgPokemon size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <TrainerProvider id={selectedId} editingMode="view">
            <TrainerSheet />
          </TrainerProvider>
        )}
      </SheetContainer>
    </div>
  );
};
