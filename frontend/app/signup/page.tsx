import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignUpPage() {
  return (
    <AuthLayout
      imageUrl="https://images.unsplash.com/photo-1551392505-f4056032826e?w=1000&q=90"
      activeDot={1}
    >
      <SignupForm />
    </AuthLayout>
  );
}
