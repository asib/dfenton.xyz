import { useEffect, useState } from "react";
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
        <div className="group w-full flex justify-end ">
            {darkMode && <span className={clsx(
                "block w-[100vw] h-[100vh] opacity-0 z-0 absolute top-[0.75rem] left-[0.75rem]",
                "rotate-90 origin-top-left pointer-events-none",
                "dark:[background:radial-gradient(circle_at_0_0,var(--dark-mode-highlight),transparent_50%)]",
                "transition ease-bounce duration-500",
                "group-hover:opacity-[15%] group-active:opacity-[15%]",
                "group-hover:blur-2xl group-active:blur-2xl"
            )}></span>}
            <button onClick={handleToggle} aria-label="toggle dark mode" title="toggle dark mode" className={clsx(
                "transition-all ease-bounce duration-500 group-hover:scale-150 group-active:scale-125",
                "drop-shadow-bg-light-mode-bg dark:drop-shadow-bg-dark-mode-bg",
                "group-hover:drop-shadow-[-1rem_1rem_5px] group-active:drop-shadow-[-1rem_1rem_5px]",
                "dark:group-hover:drop-shadow-[0_0_5px] dark:group-active:drop-shadow-[0_0_5px]",
            )}>
                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
            </button>
        </div>
    );

}