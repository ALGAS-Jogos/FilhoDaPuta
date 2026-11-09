import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
