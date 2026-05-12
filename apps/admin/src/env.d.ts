/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    db?: import("@astropress/core").Database | Awaited<ReturnType<typeof import("@astropress/core").createLocalDb>>;
    user?: {
      id: number;
      userLogin: string;
      userEmail: string;
      displayName: string;
    };
  }
}
