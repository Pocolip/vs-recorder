/** A link for feedback on simulations, when the deployment configures one (ENGINE_FEEDBACK_URL). */
export default function FeedbackLink({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
    >
      Tell us what you think
    </a>
  );
}
