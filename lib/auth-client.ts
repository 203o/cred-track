"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Session = {
  user: SessionUser;
};

type AuthResult = {
  data?: Session;
  error?: { message: string };
};

function toSession(user: FirebaseUser): Session {
  return {
    user: {
      id: user.uid,
      name: user.displayName,
      email: user.email,
      image: user.photoURL,
    },
  };
}

async function syncFirebaseUser(user: FirebaseUser) {
  await fetch("/api/firebase-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: user.uid,
      email: user.email || `${user.uid}@firebase.local`,
      name: user.displayName,
      image: user.photoURL,
    }),
  });
}

function toAuthError(error: unknown) {
  return {
    message:
      error instanceof Error ? error.message : "Authentication failed. Try again.",
  };
}

export const signIn = {
  email: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      await syncFirebaseUser(credential.user);
      return { data: toSession(credential.user) };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  },
  social: async ({
    provider,
    callbackURL = "/dashboard",
  }: {
    provider: "google";
    callbackURL?: string;
  }): Promise<AuthResult> => {
    try {
      if (provider !== "google") {
        throw new Error("Unsupported social provider");
      }

      const credential = await signInWithPopup(
        firebaseAuth,
        new GoogleAuthProvider()
      );
      await syncFirebaseUser(credential.user);
      window.location.assign(callbackURL);
      return { data: toSession(credential.user) };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  },
};

export const signUp = {
  email: async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResult> => {
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );

      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      await syncFirebaseUser(credential.user);
      return { data: toSession(credential.user) };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  },
};

export async function signOut() {
  await firebaseSignOut(firebaseAuth);
  window.location.assign("/");
}

export function useSession() {
  const [data, setData] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        await syncFirebaseUser(user);
        setData(toSession(user));
      } else {
        setData(null);
      }

      setIsPending(false);
    });
  }, []);

  return { data, isPending };
}
