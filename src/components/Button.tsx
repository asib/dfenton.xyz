import type { ReactNode } from "react";
import clsx from "clsx";
import Comment from "./Comment";

// Not used anywhere yet; kept for when a page wants it.
export default function Button({ children }: { children: ReactNode }) {
    return (
        <button className={clsx([
            "group border-none rounded-[12px] p-0 cursor-pointer",
            "bg-light-mode-text dark:bg-[#a63c06]",
        ])}>
            <Comment>Taken from Josh Comeau: https://www.joshwcomeau.com/animation/3d-button</Comment>
            <span className={clsx([
                "block py-[12px] px-[42px] rounded-[12px] -translate-y-[4px]",
                "focus:outline-none focus-visible:ring-2",
                "bg-light-mode-highlight dark:bg-dark-mode-text",
                "text-light-mode-bg dark:text-dark-mode-bg",
                "transition-transform duration-[600ms] ease-[cubic-bezier(.3, .7, .4, 1)]",
                "group-hover:-translate-y-[6px] group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(.3, .7, .4, 1.5)]",
                "group-active:-translate-y-[2px] group-active:duration-[34ms]",
            ])}>
                {children}
            </span>
        </button>
    );
}
