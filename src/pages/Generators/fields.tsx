import { Habitat } from "@/api/schemas";
import { Text } from "@/components/Text";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export const SeedInput = ({
  value,
  onChange,
  useRandomSeed,
  setUseRandomSeed,
}: {
  value: number;
  onChange: (value: string) => void;
  useRandomSeed: boolean;
  setUseRandomSeed: (useRandomSeed: boolean) => void;
}) => (
  <>
    <Text font="font-move" size="text-xl">
      Seed
    </Text>
    <Input
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={useRandomSeed}
    />
    <Text font="font-move" size="text-sm">
      Random Seed
    </Text>
    <Checkbox
      checked={useRandomSeed}
      onCheckedChange={(checked) => {
        if (typeof checked == "boolean") setUseRandomSeed(checked);
      }}
    />
  </>
);
export const habitatNames: Record<Habitat, string> = {
  CITIES: "Cities",
  TEMPERATE_DECIDUOUS_FORESTS: "Temperate Deciduous Forests",
  BADLANDS_SCRUBLANDS_AND_WASTELANDS: "Badlands, Scrublands, and Wastelands",
  ELECTROMAGNETICALLY_ACTIVE_AREAS: "Electromagnetically Active Areas",
  WOODLANDS: "Woodlands",
  TROPICAL_JUNGLES: "Tropical Jungles",
  CAVES: "Caves",
  FIELDS_AND_MEADOWS: "Fields and Meadows",
  SWAMPS_BOGS_AND_MARSHES: "Swamps, Bogs, and Marshes",
  GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES:
    "Grasslands, Savannas, Plains, and Prairies",
  MOUNTAINS: "Mountains",
  RUINS_AND_CEMETERIES: "Ruins and Cemeteries",
  TUNDRAS_AND_BOREAL_FORESTS: "Tundras and Boreal Forests",
  LAKESIDES_AND_RIVERSIDES: "Lakesides and Riversides",
  GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES: "Glaciers, Mountain Peaks, and Icy Caves",
  VOLCANOES: "Volcanoes",
  LAKES: "Lakes",
  BEACHES: "Beaches",
  PONDS: "Ponds",
  STREAMS_AND_RIVERS: "Streams and Rivers",
  OCEANIC_ABYSSES: "Oceanic Abysses",
  POLAR_SEAS: "Polar Seas",
  TROPICAL_SEAS_AND_CORAL_REEFS: "Tropical Seas and Coral Reefs",
  OPEN_OCEAN_AND_THE_CONTINENTAL_SHELF: "Open Ocean and the Continental Shelf",
  DESERTS: "Deserts",
};
