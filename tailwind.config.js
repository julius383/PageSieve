/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: ['class'],
    content: [
        './packages/extension/src/**/*.{html,js,svelte,ts}',
        './packages/extension/public/**/*.html',
    ],
    plugins: [require('tailwindcss-animate')],
};

export default config;
