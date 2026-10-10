import { IconContext } from "react-icons";
import { CgPokemon } from "react-icons/cg";
import { Link } from "react-router-dom";
import { Box } from "@/components/Box";
import { Text } from "@/components/Text";
import { appRoutes } from "@/routes";
export const HomePage = () => (
  <div
    className="home-layout flex flex-col justify-center p-5 space-y-2"
    id="home-welcome"
  >
    <div className="absolute top-0 left-0 w-full h-full z-[0]">
      <CgPokemon
        className="absolute top-0 left-0 w-full h-full"
        color="#5f5c54"
      />
    </div>
    <Text
      className="home-title text-center leading-none z-10"
      color="text-white"
    >
      {"Welcome to "}
      <br />
      {" PokéroleDex"}
    </Text>
    <Text size="text-2xl" color="text-white" className="text-center  z-10">
      Choose a section to start
    </Text>
    <div className="home-links grid gap-3 z-10">
      {appRoutes
        .filter((route) => !(route.ignoreLink ?? false))
        .map((route) => (
          <Link key={route.path} to={route.path}>
            <Box
              color="bg-pokerole-red"
              withBorder={true}
              className="home-tile p-3 flex justify-center flex-col items-center space-y-2 hover:scale-105 transition-transform duration-300 ease-in-out"
            >
              <IconContext.Provider
                value={{
                  color: "white",
                  size: "2.5em",
                }}
              >
                {route.icon}
              </IconContext.Provider>
              <Text
                size="text-lg"
                color="text-white"
                className="whitespace-nowrap"
              >
                {route.name}
              </Text>
            </Box>
          </Link>
        ))}
    </div>
  </div>
);
