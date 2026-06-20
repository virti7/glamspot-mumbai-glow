import { AuthLayout } from "@/components/auth/AuthLayout";
import { SigninForm } from "@/components/auth/SigninForm";

export default function SignInPage() {
  return (
    <AuthLayout
      imageUrl="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1000&q=90"
      activeDot={0}
    >
      <SigninForm />
    </AuthLayout>
  );
}
