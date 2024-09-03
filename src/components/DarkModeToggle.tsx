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
        <div className="w-full flex justify-end ">
            <button onClick={handleToggle} aria-label="toggle dark mode" title="toggle dark mode" className={clsx(
                "transition-all ease-bounce duration-500 hover:scale-150 active:scale-125",
                "drop-shadow-bg-light-mode-bg dark:drop-shadow-bg-dark-mode-bg",
                "hover:drop-shadow-[-1rem_1rem_5px] active:drop-shadow-[-1rem_1rem_5px]",
                "hover:drop-shadow-[0_0_5px] active:drop-shadow-[0_0_5px]",
                "dark:hover:drop-shadow-[0_0_5px] dark:active:drop-shadow-[0_0_5px]",
            )}>
                {/* <span className={clsx(
                    "block w-full h-full rounded-full opacity-[15%] z-0 absolute top-0 left-0 transition ease-bounce",
                    "dark:bg-dark-mode-highlight bg-light-mode-highlight",
                    "group-hover:opacity-[15%] group-active:opacity-[15%]",
                    "group-hover:blur-sm group-active:blur-sm"
                )}></span> */}
                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
            </button>
        </div>
    );

}