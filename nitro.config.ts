import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  compatibilityDate: 'latest',
  srcDir: 'server',
  imports: false,
  preset: 'bun',
  runtimeConfig: {
    imapflow: {
      host: '',
      port: 0,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
      logger: false,
    },
  },
});
