import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import Joyride, {
  ACTIONS,
  type CallBackProps,
  EVENTS,
  STATUS,
  type Step,
  type TooltipRenderProps,
} from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/api/client";
import { Box } from "@/components/Box";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
/** A joyride step with a CSS-selector target and the route to open before showing it. */
type TutorialStep = Step & { target: string; route?: string };
const TutorialTooltip = React.forwardRef<HTMLDivElement, TooltipRenderProps>(
  (props, ref) => {
    const {
      backProps,
      closeProps,
      index,
      isLastStep,
      primaryProps,
      skipProps,
      step,
      tooltipProps,
    } = props;
    const title = step?.title ?? "";
    const content = step?.content ?? null;
    return (
      <div {...tooltipProps} ref={ref}>
        <Box color="bg-pokerole-beige" className="p-4 max-w-md">
          <div className="flex items-start justify-between mb-2">
            {title !== "" ? (
              <Text size="text-xl" className="mb-0">
                {title}
              </Text>
            ) : (
              <div />
            )}
            <button
              {...closeProps}
              aria-label={closeProps?.title}
              className="text-lg font-bold px-2 ml-2"
            >
              ×
            </button>
          </div>
          {content != null && (
            <div className="mb-4">
              <Text size="text-base" font="font-move" className="leading-snug">
                {content}
              </Text>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="default" size="sm" {...skipProps}>
                {skipProps?.title ?? "Skip"}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              {index > 0 && (
                <Button variant="outline" size="sm" {...backProps}>
                  {backProps?.title ?? "Back"}
                </Button>
              )}
              <Button variant="green" size="sm" {...primaryProps}>
                {primaryProps?.title ?? (isLastStep ? "Close" : "Next")}
              </Button>
            </div>
          </div>
        </Box>
      </div>
    );
  },
);
TutorialTooltip.displayName = "CustomJoyrideTooltip";
/** On mobile, retarget sidebar steps to their counterparts in the mobile menu. */
const adaptSteps = (steps: TutorialStep[], isMobile: boolean): TutorialStep[] =>
  isMobile
    ? steps.map((step) => {
        const target = step.target;
        if (target != null && target.startsWith("#nav-link-")) {
          return {
            ...step,
            target: target.replace("#nav-link-", "#mobile-nav-link-"),
            placement: step.placement === "right" ? "bottom" : step.placement,
          };
        }
        if (target === "#nav-login-button") {
          return {
            ...step,
            target: "#mobile-nav-login-button",
            placement: "bottom",
          };
        }
        if (target === "#nav-ko-fi-button") {
          return {
            ...step,
            target: "#mobile-nav-ko-fi-button",
            placement: "bottom",
          };
        }
        return step;
      })
    : steps;
const GUEST_STEPS: TutorialStep[] = [
  {
    title: "Welcome to PokéroleDex",
    target: "#home-welcome",
    content:
      "Welcome to PokéroleDex: a place to manage your Pokémon and Trainer sheets and to reference book content.",
    placement: "bottom",
    route: "/home",
    disableBeacon: true,
  },
  {
    title: "Pokémon Section",
    target: "#nav-link-pokemon",
    content:
      "Open the Pokémon section from the sidebar to browse available Pokémon from the book.",
    placement: "right",
    route: "/pokemon",
    disableBeacon: true,
  },
  {
    title: "Searching Pokémon",
    target: "#pokemon-search-input",
    content:
      "Use this search box to quickly find Pokemon by name or filter below.",
    placement: "bottom",
    route: "/pokemon",
    disableBeacon: true,
  },
  {
    title: "Moves Section",
    target: "#nav-link-moves",
    content:
      "The Moves section works similarly. Browse and inspect moves here.",
    placement: "right",
    route: "/moves",
    disableBeacon: true,
  },
  {
    title: "Items Section",
    target: "#nav-link-items",
    content: "Items are available in the Items tab. Check them out.",
    placement: "right",
    route: "/items",
    disableBeacon: true,
  },
  {
    title: "Generators",
    target: "#nav-link-generators",
    content:
      "Use Generators as a GM to quickly create Pokemon statblocks or Items.",
    placement: "right",
    route: "/generators",
    disableBeacon: true,
  },
  {
    title: "Generating a Pokémon",
    target: "#generator-generate-button",
    content: "Pick generator options and press Generate to create a Pokémon.",
    placement: "bottom",
    route: "/generators/pokemon",
    disableBeacon: true,
  },
  {
    title: "Log In",
    target: "#nav-login-button",
    content:
      "Log in to unlock saving, creating and managing your own Pokemon and campaigns.",
    placement: "left",
    disableBeacon: true,
  },
  {
    title: "Support the Project",
    target: "#nav-ko-fi-button",
    content:
      "If you enjoy using the app and want to help keep the server live (I'm paying for it out of pocket), you can spare a few coins here. A dollar goes a long way!",
    placement: "top",
    disableBeacon: true,
  },
];
const getGuestSteps = (isMobile: boolean) => adaptSteps(GUEST_STEPS, isMobile);
const USER_STEPS: TutorialStep[] = [
  {
    title: "My Pokemon",
    target: "#nav-link-my-pokemon",
    content: "This is your My Pokemon area. Your saved Pokemon live here.",
    placement: "right",
    route: "/myPokemon",
    disableBeacon: true,
  },
  {
    title: "Adding Pokemon",
    target: "#nav-link-pokemon",
    content:
      'Go to the Pokemon section. Select a Pokemon template to view its details, then click the green "Add to my pokemon" button to add it to your collection.',
    placement: "right",
    disableBeacon: true,
  },
  {
    title: "Viewing Pokemon Sheets",
    target: "#my-pokemon-list",
    content:
      "The Pokemon sheet will appear here as a fresh unranked Pokemon. Use the Rank Up button to level it up! Or edit it how you like.",
    placement: "right",
    disableBeacon: true,
  },
  {
    title: "My Trainers",
    target: "#nav-link-my-trainers",
    content: "Create and manage Trainers here. Trainers can hold Pokemon.",
    placement: "right",
    route: "/myTrainers",
    disableBeacon: true,
  },
  {
    title: "Create Trainer",
    target: "#create-trainer-button",
    content: "Use this button to create a new trainer.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    title: "Campaigns",
    target: "#nav-link-campaigns",
    content:
      "Campaigns let you create your own custom Pokémon, moves, abilities and items for your games.",
    placement: "right",
    route: "/campaigns",
    disableBeacon: true,
  },
  {
    title: "Create Campaign",
    target: "#create-campaign-button",
    content: "Create a campaign here to create custom content.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    title: "Campaign Configuration",
    target: "#campaign-config-selector",
    content:
      "Use this selector to configure which campaigns are visible across the app.",
    placement: "top",
    disableBeacon: true,
  },
];
const getUserSteps = (isMobile: boolean) => adaptSteps(USER_STEPS, isMobile);
const GUEST_TUTORIAL_KEY = "tutorial-completed-guest";
const USER_TUTORIAL_KEY = "tutorial-completed-user";
const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};
export const Tutorial = ({
  openDrawer,
  closeDrawer,
  isDrawerOpened,
}: {
  openDrawer?: () => void;
  closeDrawer?: () => void;
  isDrawerOpened?: boolean;
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const steps = isAuthenticated ? getUserSteps(!isDesktop) : getGuestSteps(!isDesktop);
  const storageKey = isAuthenticated ? USER_TUTORIAL_KEY : GUEST_TUTORIAL_KEY;
  const [run, setRun] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  /** True while recovering from a missing target by navigating to the step's route. */
  const [isRecovering, setIsRecovering] = React.useState(false);
  /** True while waiting for the first step's target to appear. */
  const isStarting = React.useRef(false);
  const isDrawerOpenedRef = React.useRef(isDrawerOpened ?? false);
  React.useEffect(() => {
    isDrawerOpenedRef.current = isDrawerOpened ?? false;
  }, [isDrawerOpened]);
  React.useEffect(() => {
    setRun(false);
    setStepIndex(0);
    setIsRecovering(false);
  }, [isAuthenticated]);
  React.useEffect(() => {
    if (isRecovering) return;
    if (readFlag(storageKey)) {
      setRun(false);
      return;
    }
    if (stepIndex !== 0 || isStarting.current) return;
    const firstStep = steps[0];
    if (firstStep == null) return;
    const route = firstStep.route;
    if (typeof route == "string" && route.length > 0 && location.pathname !== route) {
      navigate(route);
      return;
    }
    const target = firstStep.target;
    isStarting.current = true;
    const waitForTarget = () => {
      if (document.querySelector(target) != null) {
        isStarting.current = false;
        setRun(true);
      } else {
        setTimeout(waitForTarget, 100);
      }
    };
    let timeout: ReturnType<typeof setTimeout>;
    if (
      !isDesktop &&
      ((target != null && target.startsWith("#mobile-nav-link-")) ||
        target === "#mobile-nav-login-button" ||
        target === "#mobile-nav-ko-fi-button") &&
      openDrawer != null
    ) {
      try {
        openDrawer();
      } catch {}
      timeout = setTimeout(waitForTarget, 400);
    } else timeout = setTimeout(waitForTarget, 200);
    return () => {
      isStarting.current = false;
      clearTimeout(timeout);
    };
  }, [storageKey, location.pathname, steps, navigate, stepIndex, isRecovering]);
  const completeTutorial = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setRun(false);
  };
  const handleCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;
    if (type === EVENTS.TOUR_START) setStepIndex(0);
    if (type === "error:target_not_found") {
      const step = data.step as TutorialStep;
      const route = step?.route;
      if (typeof route == "string" && route.length > 0 && location.pathname !== route) {
        setIsRecovering(true);
        setRun(false);
        navigate(route);
        const target = step?.target;
        const waitForTarget = () => {
          if (
            !isDesktop &&
            ((target != null && target.startsWith("#mobile-nav-link-")) ||
              target === "#mobile-nav-login-button" ||
              target === "#mobile-nav-ko-fi-button") &&
            openDrawer != null
          )
            try {
              openDrawer();
            } catch {}
          if (document.querySelector(target) != null) {
            setTimeout(() => {
              setIsRecovering(false);
              setRun(true);
            }, 100);
          } else {
            setTimeout(waitForTarget, 100);
          }
        };
        setTimeout(waitForTarget, 300);
      }
    }
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        setStepIndex(nextIndex);
        const nextStep = steps[nextIndex];
        if (nextStep?.route != null && location.pathname !== nextStep.route) {
          navigate(nextStep.route);
        }
        try {
          const currentStep = steps[index];
          const currentTarget = currentStep?.target;
          const nextTarget = nextStep?.target;
          const nextIsMobileNav =
            typeof nextTarget == "string" &&
            (nextTarget.startsWith("#mobile-nav-link-") ||
              nextTarget === "#mobile-nav-login-button" ||
              nextTarget === "#mobile-nav-ko-fi-button");
          const currentIsMobileNav =
            typeof currentTarget == "string" &&
            (currentTarget.startsWith("#mobile-nav-link-") ||
              currentTarget === "#mobile-nav-login-button" ||
              currentTarget === "#mobile-nav-ko-fi-button");
          if (!isDesktop && currentIsMobileNav && closeDrawer != null && !nextIsMobileNav) {
            setTimeout(() => {
              try {
                closeDrawer();
              } catch {}
            }, 300);
          }
          if (!isDesktop && nextIsMobileNav && openDrawer != null) {
            setRun(false);
            setTimeout(() => {
              try {
                openDrawer();
              } catch {}
              const waitForTarget = () => {
                if (document.querySelector(nextTarget) != null) {
                  setTimeout(() => {
                    setRun(true);
                  }, 100);
                } else {
                  setTimeout(waitForTarget, 100);
                }
              };
              setTimeout(waitForTarget, 400);
            }, 50);
          }
        } catch {}
      } else if (action === ACTIONS.PREV) setStepIndex(index - 1);
    }
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) completeTutorial();
    if (data.action === ACTIONS.CLOSE) completeTutorial();
  };
  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      scrollToFirstStep={true}
      disableCloseOnEsc={false}
      disableOverlayClose={false}
      spotlightClicks={true}
      run={run}
      tooltipComponent={TutorialTooltip}
      callback={handleCallback}
      styles={{
        options: {
          zIndex: 1e4,
        },
      }}
      floaterProps={{
        styles: {
          arrow: {
            color: "rgba(209,201,178,255)",
          },
        },
      }}
    />
  );
};
