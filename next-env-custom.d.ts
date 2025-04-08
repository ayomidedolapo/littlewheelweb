// This file is not used by TypeScript directly, but it helps with Next.js type checking
// during the build process.

declare global {
  namespace JSX {
    // Using a specific property instead of extending with Record
    interface IntrinsicAttributes {
      // Add a specific property to avoid the empty interface warning
      _nextJsParams?: unknown;
    }
  }
}

// Define the PageProps interface to match what Next.js expects
declare module "next" {
  interface PageProps {
    params: Promise<Record<string, string>>;
    searchParams?: Record<string, string | string[] | undefined>;
  }
}

export {};
