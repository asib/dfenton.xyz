import { useEffect, useRef, useState } from "react";
import DarkModeIcon from "./DarkModeIcon";
import LightModeIcon from "./LightModeIcon";
import clsx from "clsx";

const getTheme = (): string | null => {
    const theme = window.localStorage.getItem('theme');
    return theme;
}

const isDarkModeEnabled = (): boolean => {
    return getTheme() === 'dark';
}

export default function DarkModeToggle() {
    const [darkMode, setDarkMode] = useState<boolean>(isDarkModeEnabled());

    const containerRef = useRef<HTMLDivElement | null>(null);

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
        }
        window.localStorage.setItem('theme', enabled ? 'light' : 'dark');
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <div ref={containerRef} className={clsx(
            "group fixed top-2 right-3",
            "border rounded-full p-2",
            "border-light-mode-text dark:border-dark-mode-text",
            "bg-light-mode-bg dark:bg-dark-mode-bg",
            "md:p-0 md:border-none md:bg-transparent",
            "md:hover:p-0 md:active:p-0",
            "md:hover:top-3 md:active:top-3 md:hover:right-4 md:active:right-4",
            "md:motion-safe:transition-all md:motion-safe:ease-bounce md:motion-safe:duration-500",
            "md:motion-safe:[&:hover_~_*_*]:drop-shadow-sun-shadow md:motion-safe:[&:hover_~_*_*]:transform-gpu"
        )}
        >
            <div className="w-full flex justify-end">
                {darkMode && <div className={clsx(
                    "max-sm:hidden w-[100vw] h-[100vh] opacity-0 z-[-1] absolute top-[0.75rem] left-[0.75rem]",
                    "rotate-90 origin-top-left pointer-events-none overflow-visible blur-2xl",
                    "[background:radial-gradient(circle_at_0_0,var(--dark-mode-highlight),transparent_50%)]",
                    "motion-safe:transition-opacity motion-safe:ease-bounce motion-safe:duration-500",
                    "group-hover:opacity-[15%] group-active:opacity-[15%]"
                )}></div>}
                <button onClick={handleToggle} aria-label="toggle dark mode" title="toggle dark mode" className={clsx(
                    "drop-shadow-bg-light-mode-bg dark:drop-shadow-bg-dark-mode-bg",
                    "md:motion-safe:transition-all md:motion-safe:ease-bounce md:motion-safe:duration-500",
                    "md:group-hover:scale-150 md:group-active:scale-125",
                    "md:group-hover:drop-shadow-[-1rem_1rem_5px] md:group-active:drop-shadow-[-1rem_1rem_5px]",
                    "md:dark:group-hover:drop-shadow-[0_0_5px] md:dark:group-active:drop-shadow-[0_0_5px]",
                )}
                >
                    {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                </button>
            </div>
        </div>
    );

}