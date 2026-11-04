import * as React from "react"

export const SampleStageNavigationContext = React.createContext<(stage: number) => void>(() => undefined)
