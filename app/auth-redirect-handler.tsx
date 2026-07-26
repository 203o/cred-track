"use client";

import { useEffect } from "react";
import {
  authRedirectErrorEvent,
  authRedirectErrorKey,
  handleAuthRedirectResult,
} from "@/lib/auth-client";

export default function AuthRedirectHandler() {
  useEffect(() => {
    handleAuthRedirectResult().then((result) => {
      if (result.error) {
        window.sessionStorage.setItem(
          authRedirectErrorKey,
          result.error.message
        );
        window.dispatchEvent(
          new CustomEvent(authRedirectErrorEvent, {
            detail: result.error.message,
          })
        );
      }
    });
  }, []);

  return null;
}
