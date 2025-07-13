import { auth, signOut } from "@/auth";
import SignInButton from "@/components/SessionComponents/SignInButton";
import SignoutButton from "@/components/SessionComponents/SignoutButton";
export default async function Login() {
  const session = await auth();

  if (!session) {
    return (
      <div>
        <SignInButton />
      </div>
    );
  }

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name}</p>
        <p>{session.user.id}</p>
        <SignoutButton />
      </div>
    );
  }
}
