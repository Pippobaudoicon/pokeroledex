import { RxCross1, RxHamburgerMenu } from "react-icons/rx";
import { TbPokeball } from "react-icons/tb";
import { Link } from "react-router-dom";
import { Text } from "@/components/Text";
import { IssueButton } from "@/layout/IssueButton";
import { LocalNotes } from "@/layout/LocalNotes";
import {
  AccountButton,
  LocalWorkspaceLabel,
  SessionIndicator,
} from "@/layout/SessionIndicator";
import { type AppRoute, appRoutes } from "@/routes";
export const MobileNav = ({
  drawerOpened,
  toggle,
}: {
  drawerOpened: boolean;
  toggle: () => void;
}) => {
  return (
    <>
      <nav className="mobile-header h-16 flex flex-row items-center bg-pokerole-black p-2 justify-between md:hidden fixed w-full z-30">
        <TbPokeball size={32} color="white" />
        <Text color="text-white" size="text-3xl">
          PokéroleDex
        </Text>
        <button
          type="button"
          aria-label={drawerOpened ? "Close navigation" : "Open navigation"}
          aria-expanded={drawerOpened}
          aria-controls="mobile-navigation"
          className="flex justify-center items-center text-white"
          onClick={toggle}
        >
          {drawerOpened ? (
            <RxCross1 size={24} color="white" />
          ) : (
            <RxHamburgerMenu size={24} color="white" />
          )}
        </button>
      </nav>
      <div
        id="mobile-navigation"
        // @ts-expect-error React 18 types lack `inert`; React still passes it to the DOM.
        inert={drawerOpened ? undefined : ""}
        className={`mobile-menu fixed top-16 left-0 h-auto max-h-[calc(100vh-4rem)] overflow-y-auto w-screen flex flex-col bg-pokerole-black md:hidden transition-all duration-500 transform ${drawerOpened ? "translate-y-0" : "-translate-y-full"} z-20 `}
      >
        {appRoutes
          .filter((route) => !(route.ignoreLink ?? false))
          .map((route, index) => (
            <MobileNavLink key={index} appRoute={route} onClick={toggle} />
          ))}
        <div className="flex flex-col gap-2 p-2">
          <div className="flex flex-row justify-around items-center gap-2">
            <SessionIndicator displayText={true} />
            <div id="mobile-nav-login-button">
              <AccountButton />
            </div>
          </div>
          <div className="flex flex-row justify-center items-center gap-2">
            <div id="mobile-nav-ko-fi-button">
              <LocalWorkspaceLabel />
            </div>
            <div id="mobile-nav-feedback-button">
              <LocalNotes />
            </div>
          </div>
          <div className="flex justify-center">
            <IssueButton />
          </div>
        </div>
      </div>
    </>
  );
};
const MobileNavLink = ({
  appRoute,
  onClick,
}: {
  appRoute: AppRoute;
  onClick: () => void;
}) => {
  const id = `mobile-nav-link-${appRoute.name.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Link to={appRoute.path} onClick={onClick} id={id}>
      <div className="p-2 hover:bg-pokerole-red text-white font-square flex flex-row items-center text-2xl">
        <div className="mr-2">{appRoute.icon}</div>
        {appRoute.name}
      </div>
    </Link>
  );
};
