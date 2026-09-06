import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths let the same build work from a normal GitHub Pages project
  // URL (https://user.github.io/repository/) as well as a user site.
  base: './',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
});
