import { type HTMLMotionProps, motion, useInView } from "motion/react"
import type React from "react"
import type { Variants } from "motion/react"
import { useRef } from "react"

type TimelineContentProps<T extends keyof HTMLElementTagNameMap> = {
  children?: React.ReactNode
  animationNum: number
  className?: string
  timelineRef: React.RefObject<HTMLElement | null>
  as?: T
  customVariants?: Variants
  once?: boolean
} & HTMLMotionProps<T>

export const TimelineContent = <T extends keyof HTMLElementTagNameMap = "div">({
  children,
  animationNum,
  timelineRef,
  className,
  as,
  customVariants,
  once=false,
  ...props
}: TimelineContentProps<T>) => {
  const defaultSequenceVariants = {
    visible: (i: number) => ({
      filter: "blur(0px)",
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.5,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(20px)",
      y: 0,
      opacity: 0,
    },
  }

  const sequenceVariants = customVariants || defaultSequenceVariants

  const isInView = useInView(timelineRef, {
    once
  })

  const MotionComponent = motion[as || "div"] as React.ElementType

  return (
    <MotionComponent
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationNum}
      variants={sequenceVariants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}

type VerticalCutRevealProps = {
  children: string
  splitBy?: "words" | "chars"
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center"
  reverse?: boolean
  transition?: {
    type?: "spring" | "tween" | "inertia"
    stiffness?: number
    damping?: number
    delay?: number
  }
  className?: string
}

export default function VerticalCutReveal({
  children,
  splitBy = "words",
  staggerDuration = 0.1,
  staggerFrom = "first",
  reverse = false,
  transition = {
    type: "spring" as const,
    stiffness: 250,
    damping: 30,
    delay: 0,
  },
  className = "",
}: VerticalCutRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const splitText = splitBy === "words" ? children.split(" ") : children.split("")
  
  const getDelay = (index: number) => {
    if (staggerFrom === "first") {
      return reverse ? (splitText.length - 1 - index) * staggerDuration : index * staggerDuration
    } else if (staggerFrom === "last") {
      return reverse ? index * staggerDuration : (splitText.length - 1 - index) * staggerDuration
    } else {
      const center = Math.floor(splitText.length / 2)
      const distance = Math.abs(index - center)
      return distance * staggerDuration
    }
  }

  return (
    <span ref={ref} className={className}>
      {splitText.map((item, index) => (
        <motion.span
          key={index}
          initial={{ y: 50, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{
            ...transition,
            delay: (transition.delay || 0) + getDelay(index),
          }}
          style={{ display: "inline-block" }}
        >
          {item}
          {splitBy === "words" && index < splitText.length - 1 && " "}
        </motion.span>
      ))}
    </span>
  )
}