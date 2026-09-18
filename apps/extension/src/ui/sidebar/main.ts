import '@/ui/app.css';
import App from '@/ui/sidebar/App.svelte';
import { mount } from 'svelte';
import { initExtensionLogger } from '@/logger';

initExtensionLogger();

mount(App, { target: document.querySelector('#app')! });
