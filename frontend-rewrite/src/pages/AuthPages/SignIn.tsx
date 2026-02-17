import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | VS Recorder"
        description="Sign in to VS Recorder"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
