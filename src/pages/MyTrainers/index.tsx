// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { CgPokemon } from "react-icons/cg";
import { Link, useParams } from "react-router-dom";
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
const TrainerCard = ({
  name: e,
  gender: t,
  rank: n,
  className: r,
  onClick: o,
}) => (
  <Box
    color="bg-pokerole-red"
    className={`${r} flex flex-col items-center justify-center space-y-2 p-3 bg-gradient-to-br from-type-steel-light ${o != null ? "hover:bg-pokerole-red-light hover:from-pokerole-red-light" : ""}`}
    onClick={o}
  >
    <div className="flex flex-row items-center gap-2">
      <RankIcon rank={n} size="md" />
      <Text size="text-3xl" color="text-white">
        {e}
      </Text>
      <GenderIcon gender={t} />
    </div>
  </Box>
);
const CreateTrainerDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    { toast: r } = useToast(),
    o = useQueryClient(),
    [s, i] = React.useState({
      name: "",
      age: 0,
      natureId: "",
      rank: Rank.UNRANKED,
    }),
    [l, c] = React.useState(undefined),
    { mutate: u } = useTrainersControllerCreate({
      onSuccess: () => {
        r({
          title: "Trainer added",
          description: (
            <>
              <span>Your trainer has been added.</span>
            </>
          ),
        }),
          o.invalidateQueries(
            queryKeyFn({
              path: "/trainers",
              variables: {},
            }),
          ),
          n(false);
      },
      onError: (p) => {
        r({
          title: "Failed to add trainer",
          description: p == null ? undefined : p.payload,
        });
      },
    }),
    f = () => {
      if (s.name === "") {
        r({
          title: "Failed to add trainer",
          description: "Name is required.",
        });
        return;
      }
      u({
        body: s,
      });
    };
  return (
    <Dialog open={t} onOpenChange={n}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
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
              value={s.name}
              onChange={(p) => {
                i({
                  ...s,
                  name: p.target.value,
                });
              }}
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Age:</Text>
            <Input
              type="number"
              placeholder="Age"
              value={s.age}
              onChange={(p) => {
                i({
                  ...s,
                  age: parseInt(p.target.value),
                });
              }}
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Nature:</Text>
            <NatureSelect
              nature={l}
              setSelectNature={(p) => {
                p != null && c(p);
              }}
              comboBoxClassName="text-xl"
              className="flex-grow"
              placeholder="Select Nature..."
            />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl min-w-20">Rank:</Text>
            <RankSelect
              rank={s.rank}
              onSelect={(p) => {
                p !== undefined &&
                  i({
                    ...s,
                    rank: p,
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
              f();
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
const TrainerList = ({ className: e, onClick: t }) => {
  const { data: n, isFetching: r } = useTrainersControllerFindAll({}),
    o = r && n == null,
    [s, i] = React.useState(""),
    l = React.useMemo(
      () =>
        n == null
          ? undefined
          : n
              .sort((u, f) => u.name.localeCompare(f.name))
              .filter((u) => u.name.toLowerCase().includes(s.toLowerCase())),
      [n, s],
    ),
    c = React.useMemo(
      () =>
        l == null
          ? undefined
          : l.map((u) => (
              <>
                <Link
                  key={u.id}
                  to={`/myTrainers/${u.id}`}
                  className="flex flex-col"
                >
                  <TrainerCard
                    key={u.id}
                    name={u.name}
                    gender={u.gender}
                    rank={u.rank}
                    onClick={() => (t == null ? undefined : t(u.id))}
                    className="flex-grow"
                  />
                </Link>
              </>
            )),
      [l],
    );
  return (
    <div className={`flex flex-col space-y-2 h-full overflow-hidden ${e}`}>
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={s}
          onChange={(u) => {
            i(u.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="rounded-t-3xl flex-1">
        <div className="grid grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 gap-2">
          {!!o && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {c}
          {!o && (
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
  const { id: e } = useParams(),
    [t, n] = React.useState(e),
    r = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    n(e);
  }, [e]);
  const OComponent = r ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <TrainerList
        className="md:col-span-1 col-span-full max-md:min-h-[15vh] max-md:max-h-[35vh]"
        onClick={(s) => {
          n(s);
        }}
      />
      <OComponent className="md:col-span-3 col-span-full h-full">
        {t === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <CgPokemon size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <TrainerProvider id={t} editingMode="view">
            <TrainerSheet />
          </TrainerProvider>
        )}
      </OComponent>
    </div>
  );
};
