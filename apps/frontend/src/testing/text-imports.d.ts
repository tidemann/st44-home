/** A stylesheet imported with `with { loader: 'text' }` in a spec: its source as a string */
declare module '*.css' {
  const text: string;
  export default text;
}
