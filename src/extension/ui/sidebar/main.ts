import '@/extension/ui/app.css';
import App from '@/extension/ui/sidebar/App.svelte';
import { mount } from 'svelte';

mount(App, { target: document.querySelector('#app')! });
