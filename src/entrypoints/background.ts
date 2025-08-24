import { PublicPath } from 'wxt/browser';
import JSZip from 'jszip';
import md5 from 'md5';
import { encode, decode } from 'html-entities';

export default defineBackground(() => {});

// Helper function
async function getFile(path: PublicPath) {
	const url = browser.runtime.getURL(path);
	return (await fetch(url)).text();
}

browser.runtime.onMessage.addListener(async article => {
	// Ignore message from popup script
	if (article === 'convert') { return; }

	// Parse HTML string
	const frag = document.createRange().createContextualFragment(article.content);

	const zip = new JSZip();

	// mimetype must be the first file
	zip.file('mimetype', 'application/epub+zip');
	zip.file('META-INF/container.xml', await getFile('/epub/container.xml'));
	zip.file('OEBPS/styles/stylesheet.css', await getFile('/epub/stylesheet.css'));

	// Convert picture elements to img
	for (const el of frag.querySelectorAll('picture')) {
		const img = el.querySelector('img');

		if (img) {
			el.outerHTML = img.outerHTML;
		} else {
			const source = el.querySelector('source');
			const src = source?.srcset.split(' ')[0];
			el.outerHTML = `<img src="${src}" alt="">`;
		}
	}

	// Fetch images and store in zip
	var images: any[] = [];

	for (const el of frag.querySelectorAll('img')) {
		console.log(el.src);
		var blob;
		try {
			blob = await (await fetch(el.src)).blob();
		} catch (e) {
			console.log(e);
			continue;
		}
		const filename = md5(el.src)
		const type = blob.type;
		const ext = type.slice(type.lastIndexOf('/') + 1);

		if (!images.some(img => img.filename == filename)) {
			images.push({ filename: filename, ext: ext, type: blob.type });
			zip.file(`OEBPS/images/${filename}.${ext}`, await blob.arrayBuffer());
		}

		el.src = `../images/${filename}.${ext}`;
	}

	// Serialize to XHTML string
	const content = new XMLSerializer().serializeToString(frag);

	// Retrieve metadata
	const id = window.location.href;
	const title = encode(article?.title || "Unnamed");
	const author = encode(article?.byline || "");
	const date = encode(article?.publishedTime || "");

	// Do token replacement and add to zip
	const content_opf = (await getFile('/epub/content.opf'))
		.toString()
		.replaceAll('$SLUG', id)
		.replaceAll('$URL', id)
		.replaceAll('$TITLE', title)
		.replaceAll('$AUTHOR', author)
		.replaceAll('$DATE', date)
		.replaceAll('$IMAGES', images.map(img => `<item id="${img.filename}" href="images/${img.filename}.${img.ext}" media-type="${img.type}"/>`).join('\r\n\t\t'));

	const toc_ncx = (await getFile('/epub/toc.ncx'))
		.toString()
		.replaceAll('$SLUG', id)
		.replaceAll('$TITLE', title)

	const content_xhtml = (await getFile('/epub/content.xhtml'))
		.toString()
		.replaceAll('$TITLE', title)
		.replaceAll('$AUTHOR', author)
		.replaceAll('$CONTENT', content);

	zip.file('OEBPS/content.opf', content_opf);
	zip.file('OEBPS/toc.ncx', toc_ncx);
	zip.file('OEBPS/text/content.xhtml', content_xhtml);

	// Generate zip file
	const zipData = await zip.generateAsync({
		type: "blob",
		streamFiles: true
	});

	// Download zip file
	const a = document.createElement('a');
	document.body.appendChild(a);
	a.style.display = 'none';
	const url = window.URL.createObjectURL(zipData);
	a.href = url;
	a.download = decode(title) + '.epub';
	a.click();
	window.URL.revokeObjectURL(url);
});