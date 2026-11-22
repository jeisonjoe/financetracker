import AuthLayout from "./components/AuthLayout";
import LoginForm from "./components/LoginForm";

export const metadata = {
  title: "Sign In",
};

export default function Page() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
