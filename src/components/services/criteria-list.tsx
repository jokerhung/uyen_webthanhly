export function CriteriaList({ items }: { readonly items: readonly string[] }) {
  return <ul className="check-list">{items.map(item => <li key={item}>{item}</li>)}</ul>;
}
