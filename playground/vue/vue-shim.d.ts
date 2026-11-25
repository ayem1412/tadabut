// `tsc` can't read .vue files: this tells it what they export. Your editor's Vue tools read them for real.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent;
  export default component;
}
