"use client";

import { MotionLabTarget } from "@motionlab/react";
import {
  CheckoutCard,
  NavbarMenu,
  SearchModal,
  Sidebar,
  Toast,
} from "@/components/demo-components";

/**
 * The targets this application exposes to MotionLab.
 *
 * These render nothing. They register real components so MotionLab can open
 * them in the overlay — which is the whole integration story: the developer
 * keeps their components exactly as they are and declares which ones are worth
 * tuning.
 */
export function MotionLabTargets() {
  return (
    <>
      <MotionLabTarget
        id="checkout-card"
        label="Checkout Card"
        render={() => <CheckoutCard />}
        from={{ opacity: 0, y: 20, scale: 0.96 }}
        to={{ opacity: 1, y: 0, scale: 1 }}
        stageWidth={260}
      />
      <MotionLabTarget
        id="navbar-menu"
        label="Navbar Menu"
        render={() => <NavbarMenu />}
        from={{ opacity: 0, y: -8, scale: 0.98 }}
        to={{ opacity: 1, y: 0, scale: 1 }}
        stageWidth={240}
      />
      <MotionLabTarget
        id="search-modal"
        label="Search Modal"
        render={() => <SearchModal />}
        from={{ opacity: 0, scale: 0.94, blur: 4 }}
        to={{ opacity: 1, scale: 1, blur: 0 }}
        stageWidth={300}
      />
      <MotionLabTarget
        id="toast"
        label="Toast"
        render={() => <Toast />}
        from={{ opacity: 0, x: 40 }}
        to={{ opacity: 1, x: 0 }}
        stageWidth={280}
      />
      <MotionLabTarget
        id="sidebar"
        label="Sidebar"
        render={() => <Sidebar />}
        from={{ opacity: 0, x: -32 }}
        to={{ opacity: 1, x: 0 }}
        stageWidth={200}
      />
    </>
  );
}
