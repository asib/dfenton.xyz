import { useEffect, useState } from "react";
import DarkModeIcon from "./DarkModeIcon";
import LightModeIcon from "./LightModeIcon";

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
        enabled ? document.documentElement.classList.remove('dark')
            : document.documentElement.classList.add('dark');
        window.localStorage.setItem('theme', enabled ? 'light' : 'dark');
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <div className="w-full flex justify-end">
            <button onClick={handleToggle} title="toggle dark mode" aria-hidden>
                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
            </button>
        </div>
    );

}