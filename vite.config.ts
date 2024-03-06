import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/en/chess',
  plugins: [
    react(),
    svgr({
      svgrOptions: { exportType: 'named', ref: true },
      include: '**/*.svg',
    }),

    basicSsl(),
  ],
  server: {
    /* when using firefox and host is localhost webrtc will fail. You need to host it from "local nic ip" like 192.168.x.x */
    https: true,
  },
  build: {
    sourcemap: true,
  },
});
