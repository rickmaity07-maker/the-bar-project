/* Renders a [before, emphasised, after] heading from lib/i18n.ts. */
export default function Heading({ parts }: { parts: string[] }) {
  return (
    <>
      {parts[0]}
      <em>{parts[1]}</em>
      {parts[2]}
    </>
  );
}
