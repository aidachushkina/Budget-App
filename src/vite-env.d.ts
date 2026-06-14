/// <reference types="vite/client" />

// pdf.js worker imported with Vite's ?url suffix to bundle it locally.
declare module '*?url' {
  const src: string;
  export default src;
}
