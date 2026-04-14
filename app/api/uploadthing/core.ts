import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");
  return { userId };
}

export const ourFileRouter = {
  courseDocument: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
    "application/msword": {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAuth)
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, name: file.name };
    }),

  sectionDocument: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(requireAuth)
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
