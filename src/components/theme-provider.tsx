import React, { createContext, useContext, useEffect, useState } from "react"
import { ThemeId, THEMES_CATALOG } from "@/types/theme"

export type Theme = ThemeId

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const ALL_THEME_CLASSES = [
    "light",
    "dark",
    "cyberpunk",
    "doomsday",
    "sapphire",
    "amethyst",
    "solar-flare",
    "crimson",
    "emerald-nordic",
    "cosmic-aurora"
]

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement

        // Strip previous theme classes
        ALL_THEME_CLASSES.forEach((cls) => root.classList.remove(cls))

        let resolvedTheme: Theme = theme

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            resolvedTheme = systemTheme
        }

        // Add the resolved theme class
        root.classList.add(resolvedTheme)

        // For all dark-based themes, ensure 'dark' is also present for Tailwind dark: variants
        const catalogItem = THEMES_CATALOG.find((t) => t.id === resolvedTheme)
        if (catalogItem && catalogItem.isDark) {
            root.classList.add("dark")
        } else if (resolvedTheme !== "light") {
            root.classList.add("dark")
        }

        // Set color-scheme for native browser elements (scrollbars, form controls)
        root.style.colorScheme = (catalogItem?.isDark ?? resolvedTheme !== "light") ? "dark" : "light"
    }, [theme])

    // Listen for custom theme updates from other parts of the app
    useEffect(() => {
        const handleCustomThemeChange = (e: CustomEvent<{ theme: Theme }>) => {
            if (e.detail?.theme) {
                setThemeState(e.detail.theme)
            }
        }
        window.addEventListener("orbit_theme_change" as any, handleCustomThemeChange)
        return () => window.removeEventListener("orbit_theme_change" as any, handleCustomThemeChange)
    }, [])

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme)
        setThemeState(newTheme)
    }

    const value = {
        theme,
        setTheme,
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
