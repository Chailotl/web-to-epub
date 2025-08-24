import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	manifest: {
		'name': 'Web to EPUB',
		'host_permissions': ['<all_urls>'],
	}
});
