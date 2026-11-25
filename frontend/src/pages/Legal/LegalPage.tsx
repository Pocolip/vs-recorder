import PageMeta from "../../components/common/PageMeta";
import Markdown from "../../components/common/Markdown";
import terms from "../../content/legal/terms.md?raw";
import privacy from "../../content/legal/privacy.md?raw";

const DOCUMENTS = {
  terms: {
    title: "Terms of Service | VS Recorder",
    description: "The terms for using VS Recorder",
    source: terms,
  },
  privacy: {
    title: "Privacy Policy | VS Recorder",
    description: "What VS Recorder collects, how it's used, and who can see it",
    source: privacy,
  },
};

/** The Terms of Service or Privacy Policy, rendered from the Markdown in src/content/legal/. */
export default function LegalPage({ document }: { document: keyof typeof DOCUMENTS }) {
  const { title, description, source } = DOCUMENTS[document];
  return (
    <>
      <PageMeta title={title} description={description} />
      <article className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]">
        <Markdown source={source} />
      </article>
    </>
  );
}
