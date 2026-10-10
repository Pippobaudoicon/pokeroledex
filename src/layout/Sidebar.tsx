import { useHover } from "@uidotdev/usehooks";
import { IconContext } from "react-icons";
import { RxCross1, RxHamburgerMenu } from "react-icons/rx";
import { TbPokeball } from "react-icons/tb";
import { Link } from "react-router-dom";
import { Text } from "@/components/Text";
import { LocalModeBadge, SessionIndicator } from "@/layout/SessionIndicator";
import { type AppRoute, appRoutes } from "@/routes";
export const Sidebar = ({
  drawerOpened,
  toggle,
}: {
  drawerOpened: boolean;
  toggle: () => void;
}) => {
  return (
    <>
      <div
        className={`desktop-sidebar h-screen bg-pokerole-black transition-all duration-500 ease-in-out ${drawerOpened ? "w-64" : "w-20"} max-md:hidden p-2 flex flex-grow flex-col absolute`}
      >
        <div className="flex flex-col gap-2 z-10">
          <div className="flex flex-row bg-pokerole-black justify-between">
            <div className="flex flex-row space-x-2 items-center">
              <TbPokeball size={32} color="white" />
              <Text
                color="text-white"
                size="text-base"
                className={`w-0 transition-all duration-200 ease-in-out ${drawerOpened ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                PokéroleDex
              </Text>
            </div>
            <div className="flex justify-center items-center">
              {drawerOpened && (
                <RxCross1
                  size={24}
                  color="white"
                  onClick={() => {
                    toggle();
                  }}
                />
              )}
              {!drawerOpened && (
                <RxHamburgerMenu
                  size={24}
                  color="white"
                  onClick={() => {
                    toggle();
                  }}
                />
              )}
            </div>
          </div>
        </div>
        <div
          className={`sidebar-links flex flex-col h-screen bg-pokerole-black justify-center absolute transition-all duration-500 ease-in-out ${drawerOpened ? "w-64" : "w-20"} top-0 left-0 p-2 space-y-4`}
        >
          {appRoutes
            .filter((route) => !(route.ignoreLink ?? false))
            .map((route, index) => (
              <SidebarLink key={index} appRoute={route} showText={drawerOpened} />
            ))}
        </div>
        <div
          className={`flex flex-col gap-2 p-2 absolute bottom-0 left-0 z-10 ${drawerOpened ? "w-64" : "w-20"}`}
        >
          <SessionIndicator displayText={drawerOpened} />
          <div id="nav-login-button" className="flex justify-center">
            <LocalModeBadge className="text-wrap p-1" />
          </div>
        </div>
      </div>
    </>
  );
};
const SidebarLink = ({
  appRoute,
  showText = true,
}: {
  appRoute: AppRoute;
  showText?: boolean;
}) => {
  const [hoverRef, hovering] = useHover<HTMLDivElement>();
  const id = `nav-link-${appRoute.name.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Link to={appRoute.path} id={id}>
      <div className="flex flex-row space-x-2 overflow-hidden" ref={hoverRef}>
        <div
          className={`flex justify-center items-center p-4 bg-pokerole-red rounded-full ${hovering ? "bg-pokerole-red-dark" : ""} z-10`}
        >
          <IconContext.Provider
            value={{
              size: "32",
              color: "white",
            }}
          >
            {appRoute.icon}
          </IconContext.Provider>
        </div>
        <div
          className={`flex justify-center items-center whitespace-nowrap transition-all duration-500 ease-in-out ${showText ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 pointer-events-none"}`}
        >
          <Text
            color="text-white"
            size="text-xl"
            className={`${hovering ? "underline" : ""}`}
          >
            {appRoute.name}
          </Text>
        </div>
      </div>
    </Link>
  );
};
