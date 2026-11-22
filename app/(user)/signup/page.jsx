import AuthLayout from "@/app/components/AuthLayout";
import SignupForm from "@/app/components/SignupForm";

export const metadata = {
  title: "Create Account",
};

export default function Page() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
