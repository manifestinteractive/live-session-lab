"use client";

import { createContext } from "react";

// Fullscreen descendants must keep their portalled menus inside the fullscreen element.
export const VideoStagePortalContext = createContext<HTMLElement | undefined>(undefined);
