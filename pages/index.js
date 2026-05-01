import { getAuthUser } from '../lib/auth';

export default function Home() {
  return null;
}

export async function getServerSideProps(ctx) {
  const user = getAuthUser(ctx.req);
  if (user) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
  return { redirect: { destination: '/login', permanent: false } };
}
