import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            cardBox: "shadow-xl shadow-primary/10",
            headerTitle: "font-serif text-primary",
            headerSubtitle: "text-text-muted",
            formButtonPrimary:
              "bg-primary hover:bg-primary-dark shadow-md shadow-primary/20",
            footerActionLink: "text-primary hover:text-primary-dark",
          },
        }}
      />
    </div>
  );
}
