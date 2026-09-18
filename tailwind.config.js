/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: ['class'],
    content: [
        './apps/extension/src/**/*.{html,js,svelte,ts}',
        './apps/extension/public/**/*.html',
    ],
    plugins: [require('tailwindcss-animate')],
};

export default config;
