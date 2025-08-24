import { Readability } from '@mozilla/readability';

export default defineContentScript({
	matches: ['<all_urls>'],
	main() {},
});

browser.runtime.onMessage.addListener(async message => {
	if (message !== 'convert') { return; }

	const documentClone = document.cloneNode(true) as Document;
	const article = new Readability(documentClone, { keepClasses: true }).parse();

	// Check if article exists
	if (!article?.content) {
		alert("No article found");
		return;
	}

	// Convert relative links to absolute
	document.querySelectorAll('img').forEach(el => el.src = new URL(el.src).href);

	// Parse HTML string
	const frag = document.createRange().createContextualFragment(article.content);

	// Extract width and height
	for (const el of frag.querySelectorAll('img')) {
		if (!el.src) { continue; }

		// Build query string
		var query = `img[src="${el.src}"]`;
		query += el.alt ? `[alt="${el.alt.replaceAll('"', '\\"')}"]` : ':not([alt])';
		query += el.classList ? `[class="${el.classList}"]` : ':not([class])';

		// Find match
		const match = document.querySelector(query);
		if (!match) { continue; }

		// Add style
		const style = window.getComputedStyle(match);
		el.style.width = style.width;
		el.style.height = style.height;
	}

	// Remove class attributes
	for (const el of frag.querySelectorAll('*')) {
		el.removeAttribute('class');
	}

	// Serialize to string
	article.content = new XMLSerializer().serializeToString(frag);

	// Send to background script
	browser.runtime.sendMessage(article);
});