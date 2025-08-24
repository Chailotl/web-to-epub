import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	manifest: {
		'host_permissions': ['<all_urls>'],
	}
});
