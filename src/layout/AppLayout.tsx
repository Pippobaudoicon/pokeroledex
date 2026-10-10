import { useMediaQuery, useToggle } from "@uidotdev/usehooks";
import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IssueButton } from "@/layout/IssueButton";
import { LocalNotes } from "@/layout/LocalNotes";
import { MobileNav } from "@/layout/MobileNav";
import { Sidebar } from "@/layout/Sidebar";
import { SupportButton } from "@/layout/SupportButton";
import { Tutorial } from "@/layout/Tutorial";
export const AppLayout = () => {
  const [drawerOpened, toggleDrawer] = useToggle(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = isDesktop
        ? scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]')
        : scrollRef.current;
      if (scrollElement) {
        scrollElement.scrollTo({
          top: 0,
        });
      }
    }
  }, [location.pathname, isDesktop]);
  const openDrawer = () => {
    if (!drawerOpened) toggleDrawer();
  };
  const closeDrawer = () => {
    if (drawerOpened) toggleDrawer();
  };
  const ScrollContainer = isDesktop ? ScrollArea : "div";
  return (
    <>
      <MobileNav drawerOpened={drawerOpened} toggle={toggleDrawer} />
      <Sidebar drawerOpened={drawerOpened} toggle={toggleDrawer} />
      <div
        className={`app-layout min-h-screen md:h-screen bg-pokerole-gray transition-all duration-500 ease-in-out flex flex-col w-full
                 ${drawerOpened ? "md:pl-64" : "md:pl-20"}`}
        onClick={() => {
          if (drawerOpened) toggleDrawer();
        }}
      >
        <ScrollContainer
          ref={scrollRef}
          className="w-full md:h-screen max-md:min-h-[calc(100vh-4rem)] max-md:mt-16"
        >
          <div className="w-full">
            <Outlet />
            <Tutorial
              openDrawer={openDrawer}
              closeDrawer={closeDrawer}
              isDrawerOpened={drawerOpened}
            />
          </div>
        </ScrollContainer>
        <div className="hidden md:flex fixed bottom-6 right-6 z-50 space-x-3 items-end">
          <SupportButton />
          <IssueButton />
          <LocalNotes />
        </div>
      </div>
    </>
  );
};
