import { getSupportEmail } from '../constants/legal'

export function SupportEmailLink(props: { fallback: string }) {
  const email = getSupportEmail()
  if (!email) return <>{props.fallback}</>
  return <a href={`mailto:${email}`}>{email}</a>
}
