// Renders an HTML comment, which JSX can't express directly.
export default function Comment({ children }: { children: string }) {
    return <div dangerouslySetInnerHTML={{ __html: `<!-- ${children} -->` }} />;
}
