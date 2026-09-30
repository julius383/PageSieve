/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: ['class'],
    content: ['./src/**/*.{html,js,svelte,ts}', './public/**/*.html'],
    plugins: [require('tailwindcss-animate')],
};

export default config;
