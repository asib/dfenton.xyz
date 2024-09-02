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
                "transition-scale ease-bounce duration-500 hover:scale-150 active:scale-125",
                "dark:hover:text-dark-mode-highlight hover:text-light-mode-highlight",
                "dark:active:text-dark-mode-highlight active:text-light-mode-highlight"
            )}>
                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
            </button>
        </div>
    );

}