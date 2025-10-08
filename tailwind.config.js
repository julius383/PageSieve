/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}", "./public/**/*.html", "./src/lib/components/**/*.{html,js,svelte,ts}"],
	plugins: [require("tailwindcss-animate")]
};

export default config;
