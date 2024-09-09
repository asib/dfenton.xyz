import { useEffect, useRef, useState } from "react";
import DarkModeIcon from "./DarkModeIcon";
import LightModeIcon from "./LightModeIcon";
import clsx from "clsx";
import { useReducedMotion } from "@react-spring/web";

const getTheme = (): string | null => {
    const theme = window.localStorage.getItem('theme');
    return theme;
}

const isDarkModeEnabled = (): boolean => {
    return getTheme() === 'dark';
}

export default function DarkModeToggle() {
    const [darkMode, setDarkMode] = useState<boolean>(isDarkModeEnabled());
    const [isHoveringOverSun, setIsHoveringOverSun] = useState<boolean>(false);
    const reducedMotion = useReducedMotion();

    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (reducedMotion) {
            return;
        }

        const allElements = document.getElementById("root")?.getElementsByTagName("*");
        for (const element of allElements ?? []) {
            if (element === containerRef.current || containerRef.current?.contains(element)) {
                continue;
            }

            if (darkMode && isHoveringOverSun) {
                element.classList.add('motion-safe:drop-shadow-sun-shadow', 'transform-gpu');
            } else {
                element.classList.remove('motion-safe:drop-shadow-sun-shadow', 'transform-gpu');
            }
        }
    }, [darkMode, isHoveringOverSun, reducedMotion])

    useEffect(() => {
        const handleThemeUpdate = () => {
            setDarkMode(isDarkModeEnabled());
        };

        window.addEventListener('storage', handleThemeUpdate)

        return () => {
            window.removeEventListener('storage', handleThemeUpdate);
        }
    }, [setDarkMode]);

    const handleToggle = () => {
        const enabled = isDarkModeEnabled();
        if (enabled) {
            document.documentElement.classList.remove('dark')
        } else {
            document.documentElement.classList.add('dark');
            setIsHoveringOverSun(false);
        }
        window.localStorage.setItem('theme', enabled ? 'light' : 'dark');
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <div ref={containerRef} className="fixed top-2 right-3"
            onMouseEnter={() => { setIsHoveringOverSun(true) }}
            onMouseLeave={() => { setIsHoveringOverSun(false) }}
        >
            <div className="group w-full flex justify-end">
                {darkMode && <div className={clsx(
                    "w-[100vw] h-[100vh] opacity-0 z-[-1] absolute top-[0.75rem] left-[0.75rem]",
                    "rotate-90 origin-top-left pointer-events-none overflow-visible blur-2xl",
                    "[background:radial-gradient(circle_at_0_0,var(--dark-mode-highlight),transparent_50%)]",
                    "motion-safe:transition-opacity motion-safe:ease-bounce motion-safe:duration-500",
                    "group-hover:opacity-[15%] group-active:opacity-[15%]"
                )}></div>}
                <button onClick={handleToggle} aria-label="toggle dark mode" title="toggle dark mode" className={clsx(
                    "motion-safe:transition-all motion-safe:ease-bounce motion-safe:duration-500",
                    "group-hover:scale-150 group-active:scale-125",
                    "drop-shadow-bg-light-mode-bg dark:drop-shadow-bg-dark-mode-bg",
                    "group-hover:drop-shadow-[-1rem_1rem_5px] group-active:drop-shadow-[-1rem_1rem_5px]",
                    "dark:group-hover:drop-shadow-[0_0_5px] dark:group-active:drop-shadow-[0_0_5px]",
                )}
                >
                    {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                </button>
            </div>
        </div>
    );

}