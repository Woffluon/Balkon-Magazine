"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

function getDocumentAdminTheme(): "dark" | "light" {
  if (typeof document === "undefined") {
    return "light"
  }
  const { classList } = document.documentElement
  return classList.contains("admin-theme") && classList.contains("dark")
    ? "dark"
    : "light"
}

const Toaster = ({ theme, ...props }: ToasterProps) => {
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")

  useEffect(() => {
    const syncTheme = () => {
      setResolvedTheme(getDocumentAdminTheme())
    }

    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      position="top-right"
      duration={4000}
      closeButton
      richColors
      theme={theme ?? resolvedTheme}
      {...props}
    />
  )
}

export { Toaster }
